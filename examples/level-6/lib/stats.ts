// Just enough statistics to tell a real improvement from noise. No dependencies.

/** Wilson score interval for a pass rate. Better than "p ± something" when n is small or p is near 0 or 1. */
export function wilson(successes: number, n: number, z = 1.96): { low: number; high: number } {
  if (n === 0) return { low: 0, high: 1 };
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / denom;
  return { low: Math.max(0, center - margin), high: Math.min(1, center + margin) };
}

/** A small seeded random number generator, so "random" experiments are repeatable. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rate = (xs: boolean[]) => xs.filter(Boolean).length / xs.length;

/**
 * Permutation test: if variants A and B were really the same, how often would shuffling the results
 * produce a gap at least as big as the one you saw? Returns the observed gap (B minus A) and a two-sided p-value.
 */
export function permutationTest(a: boolean[], b: boolean[], opts: { iterations?: number; seed?: number } = {}): { diff: number; p: number } {
  const { iterations = 10_000, seed = 1 } = opts;
  const observed = rate(b) - rate(a);
  const pool = [...a, ...b];
  const rand = mulberry32(seed);
  let extreme = 0;
  for (let i = 0; i < iterations; i++) {
    for (let j = pool.length - 1; j > 0; j--) {
      const k = Math.floor(rand() * (j + 1));
      [pool[j], pool[k]] = [pool[k]!, pool[j]!];
    }
    const diff = rate(pool.slice(a.length)) - rate(pool.slice(0, a.length));
    if (Math.abs(diff) >= Math.abs(observed) - 1e-12) extreme++;
  }
  return { diff: observed, p: (extreme + 1) / (iterations + 1) };
}

/**
 * Stratified (per-task) permutation test. Trials of the same task are not independent: an easy task passes in both
 * variants, a hard one fails in both. So shuffle the A/B labels only WITHIN each task, never across tasks.
 * `diff` is the mean over tasks of (B rate - A rate). Use this one when comparing variants on a task suite.
 */
export function stratifiedPermutationTest(groups: { a: boolean[]; b: boolean[] }[], opts: { iterations?: number; seed?: number } = {}): { diff: number; p: number } {
  const { iterations = 10_000, seed = 1 } = opts;
  const gap = (gs: { a: boolean[]; b: boolean[] }[]) => gs.reduce((s, g) => s + rate(g.b) - rate(g.a), 0) / gs.length;
  const observed = gap(groups);
  const rand = mulberry32(seed);
  let extreme = 0;
  for (let i = 0; i < iterations; i++) {
    const shuffled = groups.map(({ a, b }) => {
      const pool = [...a, ...b];
      for (let j = pool.length - 1; j > 0; j--) {
        const k = Math.floor(rand() * (j + 1));
        [pool[j], pool[k]] = [pool[k]!, pool[j]!];
      }
      return { a: pool.slice(0, a.length), b: pool.slice(a.length) };
    });
    if (Math.abs(gap(shuffled)) >= Math.abs(observed) - 1e-12) extreme++;
  }
  return { diff: observed, p: (extreme + 1) / (iterations + 1) };
}

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

/** Chance that at least one of k attempts succeeds, estimated from n trials with c successes. */
export const passAtK = (n: number, c: number, k: number): number => 1 - choose(n - c, k) / choose(n, k);

/** Chance that ALL k attempts succeed (consistency), estimated from n trials with c successes. */
export const passPowK = (n: number, c: number, k: number): number => choose(c, k) / choose(n, k);
