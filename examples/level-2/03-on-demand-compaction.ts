// Lesson 2.2: server-side compaction on demand (beta). Claude writes the summary; you decide when.
// Run: bun run examples/level-2/03-on-demand-compaction.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";
const BETA = "compact-2026-09-04";

// Set this near your real input budget. It is low here so a short conversation compacts.
const COMPACT_AT_TOKENS = 2500;
const systemPrompt = "You help design a recipe app's data model. Keep answers short.";

const questions = [
  "What are the main entities in the data model?",
  "Which fields should Recipe have?",
  "Which fields should Ingredient have?",
  "Which fields should RecipeIngredient have?",
  "Which fields should Step have?",
  "Which indexes should these tables have?",
];

let history: Anthropic.Beta.Messages.BetaMessageParam[] = [];
for (const [index, question] of questions.entries()) {
  const turn = index + 1;
  history.push({ role: "user", content: question });
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: systemPrompt,
    betas: [BETA],
    messages: history,
  });
  history.push({ role: "assistant", content: response.content });

  // The next request sends this reply too, so count it.
  const conversationTokens = response.usage.input_tokens + response.usage.output_tokens;
  console.log(`turn ${turn}: ${conversationTokens} tokens`);

  if (conversationTokens > COMPACT_AT_TOKENS && turn < questions.length) {
    // A compaction request: same conversation plus `compaction`. No reply is generated; a summary block comes back.
    const summary = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4096, // caps the whole summarization call, so leave room
      system: systemPrompt,
      betas: [BETA],
      messages: history,
      compaction: { type: "summarize" },
    });
    // Check stop_reason before reading the block: no summary can come back.
    if (summary.stop_reason === "compaction") {
      // Replace ALL summarized messages with the block, exactly as returned (it is signed).
      history = [{ role: "assistant", content: summary.content }];
      console.log(`   -> compacted before turn ${turn + 1}`);
    }
  }
}
