import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { runEval, runTrialInTempDir, summarize, type Task } from "./eval.ts";

test("every trial gets its own fresh folder, and the folder is removed afterwards", async () => {
  const dirs: string[] = [];
  const task: Task = {
    id: "t1",
    prompt: "write hello.txt",
    setup: (dir) => { dirs.push(dir); assert.deepEqual(fs.readdirSync(dir), []); }, // starts empty every time
    grade: async (dir) => ({ pass: fs.existsSync(path.join(dir, "hello.txt")) }),
  };
  const agent = async (_t: Task, dir: string) => { fs.writeFileSync(path.join(dir, "hello.txt"), "hi"); return { turns: 2, tokens: 100 }; };

  const a = await runTrialInTempDir(task, agent);
  const b = await runTrialInTempDir(task, agent);
  assert.equal(a.pass, true);
  assert.notEqual(dirs[0], dirs[1], "trials must not share a folder");
  assert.ok(dirs.every((d) => !fs.existsSync(d)), "folders are cleaned up");
});

test("the grader checks the outcome, not what the agent claimed", async () => {
  const task: Task = { id: "t2", prompt: "x", setup: () => {}, grade: async (dir) => ({ pass: fs.existsSync(path.join(dir, "done.txt")), detail: "no done.txt" }) };
  const liar = async () => ({ turns: 1, tokens: 10 }); // says it is done, produces nothing
  const r = await runTrialInTempDir(task, liar);
  assert.equal(r.pass, false);
  assert.equal(r.detail, "no done.txt");
});

test("a crashing agent is a failed trial, not a crashed eval", async () => {
  const task: Task = { id: "t3", prompt: "x", setup: () => {}, grade: async () => ({ pass: true }) };
  const r = await runTrialInTempDir(task, async () => { throw new Error("agent exploded"); });
  assert.equal(r.pass, false);
  assert.match(r.detail!, /agent exploded/);
});

test("runEval runs every task for every trial and summarizes", async () => {
  const calls: string[] = [];
  const records = await runEval({
    variant: "A",
    taskIds: ["easy", "hard"],
    trials: 4,
    concurrency: 3,
    runTrial: async (taskId, trial) => {
      calls.push(`${taskId}:${trial}`);
      return { pass: taskId === "easy" || trial === 0, turns: 3, tokens: 1000, ms: 50 }; // hard passes only on trial 0
    },
  });
  assert.equal(records.length, 8);
  assert.equal(new Set(calls).size, 8);

  const s = summarize(records);
  assert.equal(s.n, 8);
  assert.equal(s.passes, 5); // easy 4/4 + hard 1/4
  assert.equal(s.passRate, 5 / 8);
  assert.equal(s.meanTokens, 1000);
  assert.deepEqual(s.perTask, [
    { taskId: "easy", trials: 4, passes: 4 },
    { taskId: "hard", trials: 4, passes: 1 },
  ]);
  assert.ok(s.ci.low < s.passRate && s.passRate < s.ci.high);
});
