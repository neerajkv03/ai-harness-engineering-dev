// Run: node --test examples/level-6/lib/*.test.ts      (or: bun test examples/level-6/lib)
import assert from "node:assert/strict";
import { test } from "node:test";
import { mulberry32, passAtK, passPowK, permutationTest, stratifiedPermutationTest, wilson } from "./stats.ts";

const near = (a: number, b: number, tol = 0.001) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

test("wilson interval: 8 of 10 is anywhere from about 49% to 94%", () => {
  const { low, high } = wilson(8, 10);
  near(low, 0.49);
  near(high, 0.943);
});

test("wilson interval stays inside 0..1 at the edges", () => {
  const none = wilson(0, 10);
  assert.equal(none.low, 0);
  near(none.high, 0.2775);
  near(wilson(10, 10).low, 0.7225);
  assert.deepEqual(wilson(0, 0), { low: 0, high: 1 });
});

test("more trials make the interval tighter", () => {
  const small = wilson(8, 10);
  const big = wilson(80, 100);
  assert.ok(big.high - big.low < small.high - small.low);
});

test("permutation test: identical results are not different", () => {
  const a = [...Array(7).fill(true), ...Array(3).fill(false)];
  assert.equal(permutationTest(a, [...a]).p, 1);
});

test("permutation test: 7/10 versus 8/10 is not a real difference", () => {
  const a = [...Array(7).fill(true), ...Array(3).fill(false)];
  const b = [...Array(8).fill(true), ...Array(2).fill(false)];
  const r = permutationTest(a, b);
  near(r.diff, 0.1, 1e-9);
  assert.ok(r.p > 0.5, `p was ${r.p}`);
});

test("permutation test: 0/50 versus 50/50 is a real difference", () => {
  const r = permutationTest(Array(50).fill(false), Array(50).fill(true));
  assert.ok(r.p < 0.001, `p was ${r.p}`);
});

test("stratified permutation test: shuffles A/B labels only within each task", () => {
  // Same per-task results in both variants: no difference at all.
  const same = [{ a: [true, true, false], b: [true, true, false] }, { a: [false, false, false], b: [false, false, false] }];
  assert.equal(stratifiedPermutationTest(same).p, 1);
  // B wins by the same margin on every one of 12 tasks: a consistent, real difference.
  const consistent = Array.from({ length: 12 }, () => ({ a: [false, false, true], b: [true, true, true] }));
  const r = stratifiedPermutationTest(consistent);
  near(r.diff, 2 / 3, 1e-9);
  assert.ok(r.p < 0.01, `p was ${r.p}`);
});

test("stratified test is stricter than the pooled test when one task drives the whole gap", () => {
  // 9 tasks where A and B tie, and 1 task where B wins 5/5 to 0/5. Pooling treats the 50 trials as independent.
  const ties = Array.from({ length: 9 }, () => ({ a: [true, false, true, false, true], b: [true, false, true, false, true] }));
  const groups = [...ties, { a: Array(5).fill(false), b: Array(5).fill(true) }];
  const pooled = permutationTest(groups.flatMap((g) => g.a), groups.flatMap((g) => g.b));
  const stratified = stratifiedPermutationTest(groups);
  assert.ok(stratified.p >= pooled.p, `stratified ${stratified.p} vs pooled ${pooled.p}`);
});

test("permutation test is repeatable with a seed", () => {
  const a = [true, false, true, false, false];
  const b = [true, true, true, false, true];
  assert.equal(permutationTest(a, b, { seed: 7 }).p, permutationTest(a, b, { seed: 7 }).p);
});

test("pass@k and pass^k from 5 trials with 2 successes", () => {
  near(passAtK(5, 2, 1), 0.4);
  near(passAtK(5, 2, 5), 1);
  near(passPowK(5, 2, 1), 0.4);
  near(passPowK(5, 2, 2), 0.1); // both of 2 attempts succeed
  assert.equal(passPowK(5, 2, 3), 0); // cannot get 3 successes from 2
});

test("the seeded random generator is deterministic and in range", () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 5; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});
