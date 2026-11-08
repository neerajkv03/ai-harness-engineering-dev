// Lesson 0.1: effort controls how hard the model thinks. It replaces temperature/top_p.
// Run: bun run examples/level-0/03-effort.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";
const PROMPT = "A bat and a ball cost $1.10 together. The bat costs $1.00 more than the ball. What does the ball cost?";

for (const effort of ["low", "high"] as const) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort },
    messages: [{ role: "user", content: PROMPT }],
  });
  const answer = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
  console.log(`effort=${effort.padEnd(4)} output_tokens=${response.usage.output_tokens}`);
  console.log(`  ${answer.slice(0, 120).replace(/\s+/g, " ")}...`);
}
// Do NOT send temperature, top_p or top_k: current Claude models answer 400.
// stop_sequences is still accepted if you need to cut output at a marker.
