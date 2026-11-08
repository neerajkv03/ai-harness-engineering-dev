import assert from "node:assert/strict";
import { test } from "node:test";
import { BudgetExceeded, LoopDetected, LoopGuard } from "./loop-guard.ts";

test("the third identical call trips the guard", () => {
  const g = new LoopGuard();
  g.record("search", { q: "bug" });
  g.record("search", { q: "bug" });
  assert.throws(() => g.record("search", { q: "bug" }), LoopDetected);
});

test("key order does not matter, so a reordered call still counts as a repeat", () => {
  const g = new LoopGuard({ maxRepeats: 2 });
  g.record("t", { a: 1, b: { c: 2, d: 3 } });
  assert.throws(() => g.record("t", { b: { d: 3, c: 2 }, a: 1 }), LoopDetected);
});

test("different arguments or tools are not a loop", () => {
  const g = new LoopGuard();
  for (let i = 0; i < 10; i++) g.record("search", { q: `term ${i}` });
  g.record("read", { q: "term 0" });
});

test("a repeat that falls out of the window is forgotten", () => {
  const g = new LoopGuard({ windowSize: 3, maxRepeats: 2 });
  g.record("a", 1);
  g.record("b", 1);
  g.record("c", 1);
  g.record("d", 1);
  g.record("a", 1); // the first "a" has left the 3-call window, so this is not a repeat
});

test("a total call budget stops runaway runs", () => {
  const g = new LoopGuard({ maxCalls: 5, maxRepeats: 99 });
  for (let i = 0; i < 5; i++) g.record("t", i);
  assert.throws(() => g.record("t", 5), BudgetExceeded);
});
