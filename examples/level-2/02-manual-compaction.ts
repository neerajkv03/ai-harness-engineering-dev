// Lesson 2.2: compaction by hand. When history gets big, summarize the old part and keep the recent turns word for word.
// Run: bun run examples/level-2/02-manual-compaction.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";
const COMPACT_AT_TOKENS = 1500; // low on purpose so the demo compacts; real limits are far higher
const KEEP_RECENT = 2; // messages kept verbatim (one question + one answer)

const SUMMARY_PROMPT = `Summarize this conversation so work can continue from the summary alone.
Use exactly these headings: Goal, Decisions made, Open threads, Files or names mentioned.
Keep every decision and every name. Leave out pleasantries and anything already resolved.`;

const textOf = (m: Anthropic.Message): string =>
  m.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");

async function summarize(messages: Anthropic.MessageParam[]): Promise<string> {
  // Flatten to a transcript so the summarizer sees the old turns as plain text, not as a live conversation.
  const transcript = messages.map((m) => `${m.role.toUpperCase()}: ${String(m.content)}`).join("\n\n");
  const reply = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SUMMARY_PROMPT,
    messages: [{ role: "user", content: transcript }],
  });
  return textOf(reply);
}

const questions = [
  "I'm designing a REST API for a todo app. What resources should it have?",
  "Which fields should a Todo have?",
  "How should I model tags? Many-to-many?",
  "What status codes should POST /todos return?",
  "How should pagination work for GET /todos?",
  "Summarize the decisions we made about the data model.",
];

let history: Anthropic.MessageParam[] = [];
for (const question of questions) {
  history.push({ role: "user", content: question });
  const reply = await client.messages.create({ model: MODEL, max_tokens: 16000, messages: history });
  // Text only, on purpose: thinking blocks are tied to the exact history they were made with. After compaction
  // replaces the turns before them, replaying them would be rejected, so this demo never keeps them.
  history.push({ role: "assistant", content: textOf(reply) });

  const used = reply.usage.input_tokens + reply.usage.output_tokens;
  console.log(`${String(history.length).padStart(2)} messages, ${String(used).padStart(5)} tokens: ${question.slice(0, 50)}`);

  if (used > COMPACT_AT_TOKENS && history.length > KEEP_RECENT + 1) {
    const old = history.slice(0, -KEEP_RECENT);
    const recent = history.slice(-KEEP_RECENT); // starts with a user message, so roles still alternate
    const summary = await summarize(old);
    history = [
      { role: "user", content: `Summary of our conversation so far:\n\n${summary}` },
      { role: "assistant", content: "Understood. I will continue from this summary." },
      ...recent,
    ];
    console.log(`   -> compacted ${old.length} messages into a summary; history is now ${history.length} messages`);
  }
}
