import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { scripted, textReply } from "../../level-5/lib/fake-model.ts";
import { checkProposal, evolveOnce, llmProposer, measure, type Proposal, type Proposer } from "./evolution.ts";
import { DEFAULT_HARNESS_FILES, TASKS, makeHarnessDir, readConfig } from "./evolution-scenario.ts";

const proposal = (over: Partial<Proposal> = {}): Proposal => ({
  file: "read-tool.json",
  content: JSON.stringify({ cap: 6000, truncationPointer: true }),
  rationale: "Tell the model when read output is truncated and where to continue.",
  prediction: { taskId: "edit-after-cap", minImprovement: 0.5 },
  ...over,
});
const asProposer = (p: unknown): Proposer => async () => p;

// ── Guardrails ──
test("a well-formed proposal to an editable file passes the guardrails", () => {
  assert.equal(checkProposal(proposal()).ok, true);
});

test("guardrail: the protected permissions file can never be edited", () => {
  const r = checkProposal(proposal({ file: "permissions.json", content: JSON.stringify({ bash: "allow", network: "allow" }) }));
  assert.equal(r.ok, false);
  assert.match((r as { reason: string }).reason, /protected/);
});

test("guardrail: path tricks and unknown files are rejected", () => {
  assert.equal(checkProposal(proposal({ file: "../permissions.json" })).ok, false);
  assert.equal(checkProposal(proposal({ file: "src/read-tool.json" })).ok, false);
  assert.equal(checkProposal(proposal({ file: "package.json" })).ok, false);
});

test("guardrail: invalid JSON, wrong shape, extra keys and out-of-range values are rejected", () => {
  assert.match((checkProposal(proposal({ content: "{not json" })) as { reason: string }).reason, /not valid JSON/);
  assert.equal(checkProposal(proposal({ content: JSON.stringify({ cap: 6000 }) })).ok, false);
  assert.equal(checkProposal(proposal({ content: JSON.stringify({ cap: 6000, truncationPointer: true, extra: 1 }) })).ok, false);
  assert.equal(checkProposal(proposal({ content: JSON.stringify({ cap: 5, truncationPointer: true }) })).ok, false);
});

test("guardrail: a proposal must make a falsifiable prediction about a real task", () => {
  assert.equal(checkProposal(proposal({ prediction: { taskId: "no-such-task", minImprovement: 0.5 } })).ok, false);
  assert.equal(checkProposal(proposal({ prediction: { taskId: "edit-after-cap", minImprovement: 0 } })).ok, false);
  assert.equal(checkProposal({ file: "read-tool.json" }).ok, false);
});

// ── The scenario itself ──
test("baseline harness: the target task fails every time; the other tasks pass", async () => {
  const m = await measure(makeHarnessDir(), 20);
  assert.equal(m.rates["edit-after-cap"], 0);
  assert.equal(m.rates["edit-small-file"], 1);
  assert.equal(m.rates["edit-medium-file"], 1);
  assert.ok(m.failedTrace && m.failedTrace.length > 0, "a failed trace is kept for the analyzer");
});

test("with a truncation pointer the target task mostly passes (the simulated model follows it 85% of the time)", async () => {
  const dir = makeHarnessDir({ ...DEFAULT_HARNESS_FILES, "read-tool.json": JSON.stringify({ cap: 6000, truncationPointer: true }) });
  const m = await measure(dir, 40);
  assert.ok(m.rates["edit-after-cap"]! > 0.6 && m.rates["edit-after-cap"]! < 1, `rate was ${m.rates["edit-after-cap"]}`);
  assert.equal(m.rates["edit-small-file"], 1);
  assert.equal(m.rates["edit-medium-file"], 1);
});

// ── The loop ──
test("a good proposal earns human review, does NOT change the live harness, and merges only on approval", async () => {
  const live = makeHarnessDir();
  const before = fs.readFileSync(path.join(live, "read-tool.json"), "utf8");

  const report = await evolveOnce({ harnessDir: live, proposer: asProposer(proposal()), trials: 40 });
  assert.equal(report.status, "ready_for_review");
  assert.equal(report.predictionHeld, true);
  assert.ok(report.pValue! < 0.05);
  assert.equal(fs.readFileSync(path.join(live, "read-tool.json"), "utf8"), before, "the live harness is untouched without approval");

  const merged = await evolveOnce({ harnessDir: live, proposer: asProposer(proposal()), trials: 40, approve: async () => true });
  assert.equal(merged.status, "merged");
  assert.equal(readConfig(live).truncationPointer, true);
});

test("declining the review leaves the live harness alone", async () => {
  const live = makeHarnessDir();
  const r = await evolveOnce({ harnessDir: live, proposer: asProposer(proposal()), trials: 40, approve: async () => false });
  assert.equal(r.status, "ready_for_review");
  assert.equal(readConfig(live).truncationPointer, false);
});

test("a change that does nothing is rejected: no significant improvement", async () => {
  const r = await evolveOnce({
    harnessDir: makeHarnessDir(),
    proposer: asProposer(proposal({ file: "verify.json", content: JSON.stringify({ announceChecks: true }), rationale: "Announce when checks run so the model pays attention." })),
    trials: 40,
  });
  assert.equal(r.status, "rejected");
  assert.equal(r.stage, "no_improvement");
});

test("a change to the protected permissions file is stopped at the guardrail", async () => {
  const live = makeHarnessDir();
  const before = fs.readFileSync(path.join(live, "permissions.json"), "utf8");
  const r = await evolveOnce({
    harnessDir: live,
    proposer: asProposer(proposal({ file: "permissions.json", content: JSON.stringify({ bash: "allow", network: "allow" }), rationale: "Fewer prompts means the agent gets the task done faster." })),
    trials: 40,
    approve: async () => true, // even a rubber-stamping human is never asked
  });
  assert.equal(r.status, "rejected");
  assert.equal(r.stage, "guardrail");
  assert.equal(fs.readFileSync(path.join(live, "permissions.json"), "utf8"), before);
});

test("a change that fixes the failing task but breaks another is rejected: the regression suite earns its keep", async () => {
  const r = await evolveOnce({
    harnessDir: makeHarnessDir(),
    // A smaller cap saves tokens and makes the target task pass, but the medium file no longer fits.
    proposer: asProposer(proposal({ content: JSON.stringify({ cap: 3000, truncationPointer: true }), rationale: "A smaller read cap spends fewer tokens per read, with a pointer to continue." })),
    trials: 40,
  });
  assert.equal(r.status, "rejected");
  assert.equal(r.stage, "regression");
  assert.match(r.reason!, /edit-medium-file got worse/);
  assert.ok(r.candidate!["edit-after-cap"]! > r.baseline!["edit-after-cap"]!, "it really did improve the target task");
});

test("a proposer that overpromises is rejected when its prediction does not come true", async () => {
  const r = await evolveOnce({
    harnessDir: makeHarnessDir(),
    proposer: asProposer(proposal({ prediction: { taskId: "edit-after-cap", minImprovement: 1 } })), // promises a perfect fix
    trials: 40,
  });
  assert.equal(r.status, "rejected");
  assert.equal(r.stage, "prediction");
});

test("a proposer that crashes or returns garbage is rejected, never trusted", async () => {
  const crash = await evolveOnce({ harnessDir: makeHarnessDir(), proposer: async () => { throw new Error("model timed out"); }, trials: 5 });
  assert.equal(crash.stage, "guardrail");
  assert.match(crash.reason!, /model timed out/);
  const junk = await evolveOnce({ harnessDir: makeHarnessDir(), proposer: asProposer("lol"), trials: 5 });
  assert.equal(junk.stage, "guardrail");
});

// ── The model-backed proposer ──
test("llmProposer asks for ONE JSON change and tolerates prose around it", async () => {
  const call = scripted([textReply(`Here is my proposal:\n\`\`\`json\n${JSON.stringify(proposal())}\n\`\`\``)]);
  const raw = await llmProposer(call)({ findings: [{ kind: "write_after_truncated_read", turn: 2, evidence: "x", fix: "y" }], files: DEFAULT_HARNESS_FILES });
  assert.equal(checkProposal(raw).ok, true);
  const prompt = String(call.calls[0]!.messages[0]!.content);
  assert.match(prompt, /write_after_truncated_read/);
  assert.match(prompt, /Never touch: permissions\.json/);
  assert.ok(TASKS.every((t) => prompt.includes(t.id)));
});

test("llmProposer rejects a reply with no JSON", async () => {
  await assert.rejects(llmProposer(scripted([textReply("I would increase the cap.")]))({ findings: [], files: {} }), /did not return a JSON object/);
});
