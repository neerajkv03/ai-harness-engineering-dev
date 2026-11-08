// Lesson 6.4: do the cost arithmetic before you optimize. Caching, model choice, effort and batch, in dollars.
// Run: bun run examples/level-6/07-cost-model.ts      (no API key needed)
import { BATCH_FACTOR, PRICES, costPerSolved, costUsd } from "./lib/pricing.ts";

const usd = (n: number) => `$${n.toFixed(n < 0.1 ? 4 : 2)}`;

// ── 1. A 30-turn agent run. A 20K-token stable prefix, and each turn adds 1,500 tokens of history. ──
const TURNS = 30;
const PREFIX = 20_000;
const GROWTH = 1_500;
const OUTPUT = 500;

function agentRun(model: string, cached: boolean): number {
  let total = 0;
  for (let t = 1; t <= TURNS; t++) {
    const inputThisTurn = PREFIX + GROWTH * (t - 1);
    if (!cached) {
      total += costUsd(model, { input: inputThisTurn, output: OUTPUT });
    } else if (t === 1) {
      total += costUsd(model, { input: 0, output: OUTPUT, cacheWrite5m: inputThisTurn }); // first turn: write the whole prefix
    } else {
      // Later turns: everything from the last turn is read from cache; only the new tokens are written.
      total += costUsd(model, { input: 0, output: OUTPUT, cacheRead: inputThisTurn - GROWTH, cacheWrite5m: GROWTH });
    }
  }
  return total;
}

console.log(`1. One ${TURNS}-turn agent run (${PREFIX / 1000}K-token prefix, +${GROWTH} tokens per turn, ${OUTPUT} output tokens per turn)\n`);
console.log("model               no cache     cached    saved");
for (const model of Object.keys(PRICES)) {
  const a = agentRun(model, false);
  const b = agentRun(model, true);
  console.log(`${model.padEnd(19)} ${usd(a).padEnd(12)} ${usd(b).padEnd(10)} ${((1 - b / a) * 100).toFixed(0)}%`);
}
console.log(`\nBatch API (results arrive later): another ${(1 - BATCH_FACTOR) * 100}% off, e.g. cached Claude Opus 5.5 run: ${usd(agentRun("claude-opus-5-5", true) * BATCH_FACTOR)}`);

// ── 2. Cost per SOLVED task, not per attempt. Figures are Anthropic's own measurements on a SWE-bench Pro subset. ──
console.log("\n2. Effort on Claude Opus 5.5 (Anthropic's measurements, SWE-bench Pro subset; directional, not guaranteed)\n");
console.log("effort    solved    cost/attempt   cost/solved task");
for (const [effort, solved, cost] of [["low", 0.874, 0.11], ["medium", 0.928, 0.21], ["high", 0.953, 0.29], ["xhigh", 0.967, 0.74]] as const) {
  console.log(`${effort.padEnd(9)} ${`${(solved * 100).toFixed(1)}%`.padEnd(9)} ${usd(cost).padEnd(14)} ${usd(costPerSolved(cost, solved))}`);
}
console.log("\nGoing from high to xhigh buys 1.4 more points of success for about 2.5x the cost per attempt. Whether that is worth it depends on what a failure costs YOU.");
console.log("Measure on your own tasks (lesson 6.1) before you copy anyone's numbers, including these.");
