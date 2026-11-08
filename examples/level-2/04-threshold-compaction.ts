// Lesson 2.2: threshold compaction (beta). One parameter; the API compacts by itself when input passes a limit.
// Run: bun run examples/level-2/04-threshold-compaction.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";

const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [];

async function chat(userMessage: string): Promise<string> {
  messages.push({ role: "user", content: userMessage });

  const response = await client.beta.messages.create({
    betas: ["compact-2026-01-12"],
    model: MODEL,
    max_tokens: 16000,
    messages,
    context_management: {
      // Default trigger is 150,000 input tokens. A custom trigger is shown here.
      edits: [{ type: "compact_20260112", trigger: { type: "input_tokens", value: 100_000 } }],
    },
  });

  // Append the FULL content, not just the text: a compaction block may be in it, and the API needs it next turn.
  messages.push({ role: "assistant", content: response.content });

  const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text");
  const compacted = response.content.some((b) => b.type === "compaction");
  if (compacted) console.log("   (the API compacted the earlier conversation)");
  return text?.text ?? "";
}

console.log(await chat("Help me build a Python web scraper."));
console.log(await chat("Add support for JavaScript-rendered pages."));
console.log(await chat("Now add rate limiting and error handling."));
// With a 100K trigger, three short turns will not compact. The loop and the append are what to copy.
