// Lesson 0.3: stream tokens as they are generated, like server-sent events.
// Run: bun run examples/level-0/09-streaming.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";

const stream = client.messages.stream({
  model: MODEL,
  max_tokens: 2048,
  messages: [{ role: "user", content: "Explain what a closure is in JavaScript in 4 sentences." }],
});

stream.on("text", (delta) => process.stdout.write(delta)); // fires for every text chunk

// finalMessage() resolves with the complete Message once the stream ends.
const message = await stream.finalMessage();
console.log(`\n\nstop_reason=${message.stop_reason} output_tokens=${message.usage.output_tokens}`);
