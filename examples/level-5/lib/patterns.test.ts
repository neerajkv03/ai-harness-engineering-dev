import assert from "node:assert/strict";
import { test } from "node:test";
import type { Caller } from "./agent.ts";
import { scripted, textReply } from "./fake-model.ts";
import { fanOutFanIn, runGate, runPipeline } from "./patterns.ts";

test("fan-out: workers run, one failure does not sink the rest, the synthesizer sees every report", async () => {
  const call: Caller = async (req) => {
    const task = String(req.messages[0]!.content);
    if (task.startsWith("Combine")) return textReply(`FINAL based on: ${task}`);
    if (task.includes("WORKER-B")) throw new Error("boom");
    return textReply(`report for ${task}`);
  };
  const { reports, final } = await fanOutFanIn({
    tasks: ["WORKER-A task", "WORKER-B task", "WORKER-C task"],
    workerSystem: "w",
    workerTools: [],
    synthesizeSystem: "s",
    call,
  });
  assert.equal(reports.length, 3);
  assert.match(reports[0]!, /report for WORKER-A/);
  assert.match(reports[1]!, /Worker 2 FAILED: Error: boom/);
  assert.match(reports[2]!, /report for WORKER-C/);
  assert.match(final, /Worker 2 FAILED/); // the synthesizer was told about the failure
  assert.match(final, /report for WORKER-C/);
});

test("fan-out: workers really run concurrently", async () => {
  let running = 0;
  let peak = 0;
  const call: Caller = async (req) => {
    if (String(req.messages[0]!.content).startsWith("Combine")) return textReply("ok");
    running++;
    peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, 30));
    running--;
    return textReply("r");
  };
  await fanOutFanIn({ tasks: ["a", "b", "c"], workerSystem: "w", workerTools: [], synthesizeSystem: "s", call });
  assert.equal(peak, 3);
});

test("pipeline: a failing gate sends feedback back, and the reviewer only runs after a pass", async () => {
  const feedbacks: (string | undefined)[] = [];
  let gateCalls = 0;
  let reviewed = 0;
  const result = await runPipeline({
    implement: async (feedback) => { feedbacks.push(feedback); return "impl"; },
    gate: async () => (++gateCalls === 1 ? { ok: false, output: "1 test failed: expected 2" } : { ok: true, output: "all pass" }),
    review: async () => { reviewed++; return "LGTM"; },
  });
  assert.equal(result.status, "reviewed");
  assert.equal(result.attempts, 2);
  assert.equal(reviewed, 1);
  assert.equal(feedbacks[0], undefined);
  assert.match(feedbacks[1]!, /expected 2/);
});

test("pipeline: gives up after maxFixes and never calls the reviewer", async () => {
  let reviewed = 0;
  const result = await runPipeline({
    implement: async () => "impl",
    gate: async () => ({ ok: false, output: "still failing" }),
    review: async () => { reviewed++; return "x"; },
    maxFixes: 1,
  });
  assert.equal(result.status, "gate_failed");
  assert.equal(result.attempts, 2);
  assert.equal(reviewed, 0);
});

test("runGate reports pass and fail from a real command", async () => {
  const ok = await runGate(process.execPath, ["-e", "process.exit(0)"], process.cwd());
  assert.equal(ok.ok, true);
  const bad = await runGate(process.execPath, ["-e", "console.error('nope'); process.exit(3)"], process.cwd());
  assert.equal(bad.ok, false);
  assert.match(bad.output, /nope/);
});

test("scripted fake errors when the code makes more calls than scripted", async () => {
  const call = scripted([textReply("one")]);
  await call({ system: "", messages: [], tools: [] });
  await assert.rejects(call({ system: "", messages: [], tools: [] }), /no scripted reply/);
});
