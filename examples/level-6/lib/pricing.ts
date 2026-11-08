// Prices in US dollars per million tokens (MTok), from Anthropic's pricing page. Prices change: check the page.
export type Prices = { input: number; cacheWrite5m: number; cacheWrite1h: number; cacheRead: number; output: number };

export const PRICES: Record<string, Prices> = {
  "claude-fable-5-1": { input: 10, cacheWrite5m: 12.5, cacheWrite1h: 20, cacheRead: 0.25, output: 50 },
  "claude-opus-5-5": { input: 4, cacheWrite5m: 5, cacheWrite1h: 8, cacheRead: 0.2, output: 20 },
  "claude-sonnet-5-5": { input: 2, cacheWrite5m: 2.5, cacheWrite1h: 4, cacheRead: 0.1, output: 10 },
  // Haiku 5.5 prices are for prompts up to 100K tokens. Longer prompts cost more.
  "claude-haiku-5-5": { input: 0.1, cacheWrite5m: 0.125, cacheWrite1h: 0.2, cacheRead: 0.01, output: 0.5 },
};

/** The Message Batches API is 50% cheaper, in exchange for results that arrive later. */
export const BATCH_FACTOR = 0.5;

/** `input` means UNCACHED input tokens, exactly as the API's `usage.input_tokens` reports them. */
export type TokenUsage = { input: number; output: number; cacheRead?: number; cacheWrite5m?: number; cacheWrite1h?: number };

export function costUsd(model: string, u: TokenUsage): number {
  const p = PRICES[model];
  if (!p) throw new Error(`no price for model "${model}". Known: ${Object.keys(PRICES).join(", ")}`);
  const mtok =
    u.input * p.input +
    u.output * p.output +
    (u.cacheRead ?? 0) * p.cacheRead +
    (u.cacheWrite5m ?? 0) * p.cacheWrite5m +
    (u.cacheWrite1h ?? 0) * p.cacheWrite1h;
  return mtok / 1_000_000;
}

/** You pay for completed tasks, not for tokens. A cheaper model that fails more often can cost more per solved task. */
export const costPerSolved = (costPerAttempt: number, passRate: number): number => (passRate > 0 ? costPerAttempt / passRate : Infinity);
