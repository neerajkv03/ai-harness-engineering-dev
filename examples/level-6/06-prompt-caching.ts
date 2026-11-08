// Lesson 6.4: prompt caching in action. Same long prefix: write once, read cheaply, then break it with a timestamp.
// Run: bun run examples/level-6/06-prompt-caching.ts      (about $0.02 on Claude Opus 5.5)
import Anthropic from "@anthropic-ai/sdk";
import { costUsd } from "./lib/pricing.ts";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";

// A long, STABLE prefix. The cache only works above a minimum size (512 tokens on Claude Opus 5.5), so make it big.
const manual = Array.from({ length: 120 }, (_, i) => `Rule ${i + 1}: when a support ticket mentions topic ${i + 1}, check the policy for topic ${i + 1} before replying.`).join("\n");

async function ask(label: string, system: string, question: string) {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 100,
    cache_control: { type: "ephemeral" }, // cache the prefix up to the last cacheable block, with the default 5-minute lifetime
    system,
    messages: [{ role: "user", content: question }],
  });
  const u = res.usage;
  const cost = costUsd(MODEL, { input: u.input_tokens, output: u.output_tokens, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite5m: u.cache_creation_input_tokens ?? 0 });
  console.log(`${label.padEnd(34)} uncached ${String(u.input_tokens).padStart(5)}   written ${String(u.cache_creation_input_tokens ?? 0).padStart(5)}   read ${String(u.cache_read_input_tokens ?? 0).padStart(5)}   $${cost.toFixed(5)}`);
}

const stable = `You are a support assistant.\n${manual}`;

await ask("1. first call (cache write)", stable, "Which rule covers topic 7? One sentence.");
// Calls must come one after another: a cache entry is only available once the first response has started.
await ask("2. same prefix (cache read)", stable, "Which rule covers topic 42? One sentence.");
await ask("3. timestamp in the prefix", `Current time: ${new Date().toISOString()}\n${stable}`, "Which rule covers topic 99? One sentence.");
await ask("4. a different timestamp", `Current time: ${new Date(Date.now() + 1000).toISOString()}\n${stable}`, "Which rule covers topic 99? One sentence.");

console.log("\nExpect: call 2 reads most of the prefix from cache. Calls 3 and 4 read ~0 and WRITE again, because the first bytes changed.");
console.log("A timestamp, request id or random value near the top of a prompt silently turns every request into a full-price cache write.");
