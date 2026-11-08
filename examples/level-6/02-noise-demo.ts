// Lesson 6.1: why one run per task proves nothing. A simulation of experiments where the truth is known.
// Run: bun run examples/level-6/02-noise-demo.ts      (no API key needed; takes a few seconds)
import { mulberry32, passAtK, passPowK, permutationTest } from "./lib/stats.ts";

const rand = mulberry32(2026);
const trialsOf = (n: number, p: number): boolean[] => Array.from({ length: n }, () => rand() < p);

/** Run many fake experiments: A passes at rate pA, B at rate pB, each measured with n trials. */
function experiment(pA: number, pB: number, n: number, runs = 300) {
  let looksBetter = 0; // B scores at least 10 points higher than A
  let significant = 0; // the permutation test says p < 0.05
  for (let i = 0; i < runs; i++) {
    const a = trialsOf(n, pA);
    const b = trialsOf(n, pB);
    const rate = (xs: boolean[]) => xs.filter(Boolean).length / n;
    if (rate(b) - rate(a) >= 0.1) looksBetter++;
    if (permutationTest(a, b, { iterations: 300, seed: i + 1 }).p < 0.05) significant++;
  }
  return { looksBetter: looksBetter / runs, significant: significant / runs };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

console.log("A. A and B are IDENTICAL (both pass 75% of the time). How often does B look 10+ points better by luck?\n");
console.log("trials per variant   B looks 10+ points better   test says 'significant'");
for (const n of [10, 50, 200]) {
  const r = experiment(0.75, 0.75, n);
  console.log(`${String(n).padEnd(20)} ${pct(r.looksBetter).padEnd(27)} ${pct(r.significant)}`);
}

console.log("\nB. B is REALLY better (85% vs 75%). How often does the test notice?\n");
console.log("trials per variant   test says 'significant'");
for (const n of [10, 50, 200]) console.log(`${String(n).padEnd(20)} ${pct(experiment(0.75, 0.85, n).significant)}`);

console.log("\nC. Consistency: an agent that passes a task 4 times out of 5 trials.\n");
console.log(`  pass@1 = ${passAtK(5, 4, 1).toFixed(2)}   pass@3 = ${passAtK(5, 4, 3).toFixed(2)}   (at least one success in k tries)`);
console.log(`  pass^1 = ${passPowK(5, 4, 1).toFixed(2)}   pass^3 = ${passPowK(5, 4, 3).toFixed(2)}   (ALL k tries succeed)`);
console.log("  A customer-facing agent needs pass^k, not pass@k: they run it once and it must work.");
