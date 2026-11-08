// Lesson 7.2: let traces suggest harness changes, and keep a human on the merge button.
// Run: bun run examples/level-7/02-harness-evolution.ts      (no API key needed: the model and the proposers are simulated)
// To use a real model as the proposer, pass llmProposer(anthropicCaller()) from lib/evolution.ts instead of the scripted ones.
import { evolveOnce, type Proposal, type Report } from "./lib/evolution.ts";
import { makeHarnessDir, readConfig } from "./lib/evolution-scenario.ts";

const TRIALS = 40;
const pct = (x: number) => `${Math.round(x * 100)}%`;

// Stand-ins for a model proposer. Each returns ONE proposed change, as a model would.
const proposals: Record<string, Proposal> = {
  "1. say when output is truncated": {
    file: "read-tool.json",
    content: JSON.stringify({ cap: 6000, truncationPointer: true }),
    rationale: "The failed run overwrote a file after a silently truncated read. Tell the model what was cut and where to continue.",
    prediction: { taskId: "edit-after-cap", minImprovement: 0.5 },
  },
  "2. a smaller read cap, with a pointer": {
    file: "read-tool.json",
    content: JSON.stringify({ cap: 3000, truncationPointer: true }),
    rationale: "Spend fewer tokens per read, and keep the pointer so the model can continue where it was cut off.",
    prediction: { taskId: "edit-after-cap", minImprovement: 0.5 },
  },
  "3. announce when checks run": {
    file: "verify.json",
    content: JSON.stringify({ announceChecks: true }),
    rationale: "Make the model more aware of the checks by announcing them in the transcript.",
    prediction: { taskId: "edit-after-cap", minImprovement: 0.3 },
  },
  "4. loosen the permissions": {
    file: "permissions.json",
    content: JSON.stringify({ bash: "allow", network: "allow" }),
    rationale: "Fewer approval prompts mean the agent finishes tasks faster and more reliably.",
    prediction: { taskId: "edit-after-cap", minImprovement: 0.3 },
  },
};

const live = makeHarnessDir();
console.log(`live harness: ${live}\nread-tool.json: ${JSON.stringify(readConfig(live))}\n`);

for (const [name, proposal] of Object.entries(proposals)) {
  const report = await evolveOnce({ harnessDir: live, proposer: async () => proposal, trials: TRIALS }); // no `approve`: nothing merges
  console.log(name);
  console.log(`  result: ${report.status.toUpperCase()}${report.stage ? ` at the "${report.stage}" stage` : ""}`);
  if (report.reason) console.log(`  why:    ${report.reason}`);
  if (report.candidate && report.baseline) {
    const line = (r: Record<string, number>) => Object.entries(r).map(([id, v]) => `${id} ${pct(v)}`).join(", ");
    console.log(`  before: ${line(report.baseline)}\n  after:  ${line(report.candidate)}`);
  }
  console.log();
}

// The one change that earned review. A person reads the diff and decides. Here we play that person.
async function humanReview(report: Report): Promise<boolean> {
  console.log("--- human review ---");
  console.log(`change:      ${report.proposal!.file} -> ${report.proposal!.content}`);
  console.log(`rationale:   ${report.proposal!.rationale}`);
  console.log(`prediction:  at least +${pct(report.proposal!.prediction.minImprovement)} on ${report.proposal!.prediction.taskId} (held: ${report.predictionHeld})`);
  console.log("decision:    approve\n");
  return true;
}

const final = await evolveOnce({ harnessDir: live, proposer: async () => proposals["1. say when output is truncated"]!, trials: TRIALS, approve: humanReview });
console.log(`status after review: ${final.status}`);
console.log(`live read-tool.json is now: ${JSON.stringify(readConfig(live))}`);
