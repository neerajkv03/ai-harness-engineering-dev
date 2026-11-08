import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { summarizePiSession } from "./pi-session.ts";

const fixture = fs.readFileSync(path.join(import.meta.dirname, "../fixtures/sample-pi-session.jsonl"), "utf8");

test("summarizes a Pi session file", () => {
  const s = summarizePiSession(fixture);
  assert.equal(s.entries, 11); // the header line is not counted
  assert.equal(s.userMessages, 1);
  assert.equal(s.assistantMessages, 5);
  assert.deepEqual(s.toolCalls, { read: 1, bash: 2, edit: 1 });
  assert.deepEqual(s.models, ["claude-opus-5-5"]);
  assert.deepEqual(s.stopReasons, { toolUse: 4, stop: 1 });
  assert.equal(s.compactions, 1);
});

test("finds the failed tool call", () => {
  const s = summarizePiSession(fixture);
  assert.deepEqual(s.toolErrors, [{ tool: "bash", callId: "call_2" }]);
});

test("adds up tokens and cost", () => {
  const s = summarizePiSession(fixture);
  assert.deepEqual({ input: s.usage.input, output: s.usage.output, cacheRead: s.usage.cacheRead, cacheWrite: s.usage.cacheWrite }, { input: 4750, output: 315, cacheRead: 12500, cacheWrite: 2800 });
  // 4750 input x $4 + 315 output x $20 + 12500 cache reads x $0.20 + 2800 cache writes x $5, per million
  assert.equal(s.costUsd, 0.0418);
});

test("ignores blank lines", () => {
  assert.equal(summarizePiSession(`\n${fixture}\n\n`).assistantMessages, 5);
});
