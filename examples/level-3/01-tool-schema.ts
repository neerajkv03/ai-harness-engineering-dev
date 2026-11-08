// Lesson 3.1: a well-designed tool definition. Tight enums, a description that says when to use it, examples, defaults.
// Run: bun run examples/level-3/01-tool-schema.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";

// BAD (for contrast): { name: "search", description: "Searches stuff", input_schema: { properties: { q: { type: "string" } } } }
// The model cannot tell when to use it, what "stuff" is, or what q accepts.

const searchOrders: Anthropic.Tool = {
  name: "search_orders", // verb + noun; says what it does
  description: [
    "Search a customer's orders. Use when the user asks about order status, past purchases or delivery.",
    "Returns at most 20 orders per page, newest first. If more exist, the result says so; pass `page` to continue.",
    "Examples: status='shipped' for 'where is my package'; created_after='2026-10-01' for 'orders since October'.",
  ].join(" "),
  strict: true, // the model's input is guaranteed to match this schema
  input_schema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["pending", "shipped", "delivered", "cancelled"], // an enum, not free text
        description: "Order status. Omit to include every status.",
      },
      created_after: { type: "string", format: "date", description: "ISO date YYYY-MM-DD. Only orders created on or after this date." }, // strict mode enforces "date"
      page: { type: "integer", description: "1-based page number. Default 1." },
      response_format: {
        type: "string",
        enum: ["concise", "detailed"],
        description: "'concise' returns id, status and total. 'detailed' adds line items. Default 'concise'.",
      },
    },
    required: [],
    additionalProperties: false,
  },
};

const response = await client.messages.create({
  model: MODEL,
  max_tokens: 16000,
  tools: [searchOrders],
  messages: [{ role: "user", content: "Where is my package? I ordered it a couple of weeks ago, around 2026-10-20." }],
});

for (const block of response.content) {
  if (block.type === "tool_use") console.log(block.name, JSON.stringify(block.input));
}
// Expect something like: search_orders {"status":"shipped","created_after":"2026-10-20"}
