// Lesson 6.1: measure a harness change. Run the golden tasks several times per variant, then ask whether B really beats A.
// Run: bun run examples/level-6/01-golden-tasks.ts [--trials 3] [--limit 10]
// Cost: tasks x trials x 2 variants agent runs (default 10 x 3 x 2 = 60), each a few model calls. Start with --limit 3 --trials 2.
import { anthropicCaller, runAgent } from "../level-5/lib/agent.ts";
import { fileTools } from "../level-5/lib/tools.ts";
import { runEval, runTrialInTempDir, summarize, type Task } from "./lib/eval.ts";
import { GOLDEN } from "./lib/golden-tasks.ts";
import { permutationTest } from "./lib/stats.ts";

const arg = (name: string, fallback: number) => Number(process.argv[process.argv.indexOf(`--${name}`) + 1]) || fallback;
const trials = arg("trials", 3);
const tasks = GOLDEN.slice(0, arg("limit", GOLDEN.length));
const call = anthropicCaller();

// The ONLY difference between the variants is one instruction in the system prompt. Hold everything else fixed.
const VARIANTS: Record<string, string> = {
  A: "You are a careful TypeScript programmer. You can read and write files in the working folder. You cannot run code.",
  B: "You are a careful TypeScript programmer. You can read and write files in the working folder. You cannot run code. " +
    "ALWAYS read the test file first and list the edge cases it checks before you write any code.",
};

async function evalVariant(name: string) {
  const byId = new Map<string, Task>(tasks.map((t) => [t.id, t]));
  const records = await runEval({
    variant: name,
    taskIds: tasks.map((t) => t.id),
    trials,
    concurrency: 4,
    runTrial: (taskId) =>
      runTrialInTempDir(byId.get(taskId)!, async (task, dir) => {
        const r = await runAgent({ system: VARIANTS[name]!, task: task.prompt, tools: fileTools(dir, { write: true }), call, maxTurns: 10 });
        return { turns: r.turns, tokens: r.inputTokens + r.outputTokens };
      }),
  });
  return { records, summary: summarize(records) };
}

const results: Record<string, Awaited<ReturnType<typeof evalVariant>>> = {};
for (const name of Object.keys(VARIANTS)) {
  console.log(`running variant ${name}...`);
  results[name] = await evalVariant(name);
}

console.log("\nvariant  pass rate  95% interval   tokens/trial  turns/trial");
for (const [name, { summary: s }] of Object.entries(results)) {
  const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
  console.log(`${name.padEnd(8)} ${`${s.passes}/${s.n} ${pct(s.passRate)}`.padEnd(10)} ${`${pct(s.ci.low)}-${pct(s.ci.high)}`.padEnd(14)} ${String(Math.round(s.meanTokens)).padEnd(13)} ${s.meanTurns.toFixed(1)}`);
}

const { diff, p } = permutationTest(results.A!.records.map((r) => r.pass), results.B!.records.map((r) => r.pass));
console.log(`\nB minus A: ${(diff * 100).toFixed(1)} points, p = ${p.toFixed(3)}`);
console.log(p < 0.05 ? "Unlikely to be noise. Keep B, then confirm on a fresh set of tasks." : "Could easily be noise. Do not ship B on this evidence: add tasks or trials.");

console.log("\nfailures by task (variant B):");
for (const t of results.B!.summary.perTask.filter((t) => t.passes < t.trials)) console.log(`  ${t.taskId}: ${t.passes}/${t.trials}`);
console.log("Read the transcripts of the failures before you trust any of these numbers (lesson 6.3).");
