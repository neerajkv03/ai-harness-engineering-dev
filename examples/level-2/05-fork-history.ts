// Lesson 2.3: fork a conversation. Same prefix, two different continuations, neither polluting the other.
// Run: bun run examples/level-2/05-fork-history.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";

const textOf = (m: Anthropic.Message): string =>
  m.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");

async function ask(history: Anthropic.MessageParam[], userMessage: string): Promise<string> {
  history.push({ role: "user", content: userMessage });
  const reply = await client.messages.create({ model: MODEL, max_tokens: 1024, messages: history });
  const text = textOf(reply);
  history.push({ role: "assistant", content: text });
  return text;
}

// The shared trunk: a short design discussion.
const trunk: Anthropic.MessageParam[] = [];
await ask(trunk, "I need to store user sessions for a web app. Keep answers under 60 words.");
console.log(`trunk has ${trunk.length} messages\n`);

// Fork: structuredClone gives each branch its own copy of the history.
const branchA = structuredClone(trunk);
const branchB = structuredClone(trunk);

console.log("--- branch A: Redis ---");
console.log(await ask(branchA, "Design it with Redis. What are the downsides?"));
console.log("\n--- branch B: JWT cookies ---");
console.log(await ask(branchB, "Design it with signed JWT cookies and no server store. What are the downsides?"));

console.log(`\ntrunk still has ${trunk.length} messages; branch A has ${branchA.length}, branch B has ${branchB.length}`);
// To bring a winner back, copy a short summary of the decision into the trunk, not the whole branch.
await ask(trunk, "Decision: we are going with Redis. Acknowledge in one sentence.");
