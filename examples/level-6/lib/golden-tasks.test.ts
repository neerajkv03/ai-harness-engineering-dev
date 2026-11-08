// An eval is only trustworthy if every task is solvable AND fails before it is solved.
// (Anthropic: write unambiguous tasks with reference solutions. A 0% score may mean a broken task, not a weak agent.)
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { GOLDEN } from "./golden-tasks.ts";

test("there are eleven golden tasks with unique ids", () => {
  assert.equal(GOLDEN.length, 11);
  assert.equal(new Set(GOLDEN.map((t) => t.id)).size, 11);
});

for (const task of GOLDEN) {
  test(`${task.id}: fails before it is solved, passes with the reference solution`, async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `golden-${task.id}-`));
    await task.setup(dir);

    const before = await task.grade(dir);
    assert.equal(before.pass, false, "an untouched task must fail, otherwise the grader proves nothing");

    for (const [file, content] of Object.entries(task.reference)) fs.writeFileSync(path.join(dir, file), content);
    const after = await task.grade(dir);
    assert.equal(after.pass, true, `reference solution did not pass: ${after.detail}`);
  });
}

test("the bug-fix grader rejects an agent that edits the test instead of fixing the code", async () => {
  const task = GOLDEN.find((t) => t.id === "fix-sumTo")!;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "golden-cheat-"));
  await task.setup(dir);
  fs.writeFileSync(path.join(dir, "sumTo.test.ts"), `import { test } from "node:test";\ntest("sumTo", () => {});\n`); // an empty test always passes
  const r = await task.grade(dir);
  assert.equal(r.pass, false);
  assert.match(r.detail!, /test file was changed/);
});

for (const task of GOLDEN) {
  test(`${task.id}: replacing the test file with an empty test does not pass`, async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `golden-tamper-${task.id}-`));
    await task.setup(dir);
    for (const [file, content] of Object.entries(task.reference)) fs.writeFileSync(path.join(dir, file), content);
    const testFiles = fs.readdirSync(dir).filter((f) => f.endsWith(".test.ts"));
    if (testFiles.length === 0) return; // graded on the file itself, not by a test the agent could edit
    for (const f of testFiles) {
      fs.writeFileSync(path.join(dir, f), `import { test } from "node:test";\ntest.skip("x", () => {});\n`);
    }
    const r = await task.grade(dir);
    assert.equal(r.pass, false, "a cheated test file must fail the task even when the code is right");
    assert.match(r.detail!, /test file was changed/);
  });
}

test("the cleanup grader needs BOTH behavior preserved and the logs gone", async () => {
  const task = GOLDEN.find((t) => t.id === "remove-console-log")!;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "golden-logs-"));
  await task.setup(dir);
  fs.writeFileSync(path.join(dir, "app.ts"), `export function greet(name: string): string {\n  return "wrong";\n}\n`); // logs gone, behavior broken
  assert.equal((await task.grade(dir)).pass, false);
});
