// Lesson 0.1: the API has no memory. "Memory" is you resending the history array.
// Run: bun run examples/level-0/02-stateless.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";

const textOf = (m: Anthropic.Message): string =>
  m.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

// 1. Tell the model something.
const first = await client.messages.create({
  model: MODEL,
  max_tokens: 16000,
  messages: [{ role: "user", content: "My name is Alice. Reply with one short sentence." }],
});
console.log("turn 1:", textOf(first));

// 2. Ask in a NEW request with no history: the model cannot know.
const forgetful = await client.messages.create({
  model: MODEL,
  max_tokens: 16000,
  messages: [{ role: "user", content: "What is my name? If you do not know, say so." }],
});
console.log("no history:", textOf(forgetful));

// 3. Fix: resend the whole conversation so far, plus the new question.
// Send the assistant turn back exactly as it came (`first.content`), not just its text: the reply also holds
// thinking blocks, and current models reject a history whose earlier turns were rebuilt or edited.
const history: Anthropic.MessageParam[] = [
  { role: "user", content: "My name is Alice. Reply with one short sentence." },
  { role: "assistant", content: first.content },
  { role: "user", content: "What is my name?" },
];
const remembers = await client.messages.create({ model: MODEL, max_tokens: 16000, messages: history });
console.log("with history:", textOf(remembers));
