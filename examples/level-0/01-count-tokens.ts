// Lesson 0.1: tokens are what you are billed for and what limits are measured in.
// Run: bun run examples/level-0/01-count-tokens.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
const MODEL = "claude-opus-5-5";

const samples: Record<string, string> = {
  english: "The quick brown fox jumps over the lazy dog while the sun sets slowly behind the hills.",
  json: JSON.stringify({ id: 42, name: "Ada", roles: ["admin", "dev"], active: true, meta: { n: 1 } }),
  code: "export const add = (a: number, b: number): number => { return a + b; };",
};

for (const [label, text] of Object.entries(samples)) {
  // countTokens does not run the model, so it does not generate output.
  const { input_tokens } = await client.messages.countTokens({
    model: MODEL,
    messages: [{ role: "user", content: text }],
  });
  const ratio = (text.length / input_tokens).toFixed(2);
  console.log(`${label.padEnd(8)} ${String(text.length).padStart(4)} chars -> ${input_tokens} tokens (${ratio} chars/token)`);
}
// Note: input_tokens includes a few tokens of message framing, so short strings look worse than they are.
// Compare the ratios, not the absolute numbers.
