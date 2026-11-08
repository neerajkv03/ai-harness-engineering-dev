// Lesson 0.3: two kinds of failure. API errors (you handle them) and tool errors (the model handles them).
// Run: bun run examples/level-0/10-errors.ts
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic(); // the SDK already retries 408/409/429/5xx twice (maxRetries: 2)
const MODEL = "claude-opus-5-5";

// 1. API errors: check the most specific class first. Some you fix in code, some you retry.
function explain(error: unknown): string {
  if (error instanceof Anthropic.BadRequestError) return `400: the request itself is wrong. Fix the code, never retry. (${error.message})`;
  if (error instanceof Anthropic.AuthenticationError) return "401: bad or missing API key.";
  if (error instanceof Anthropic.NotFoundError) return "404: wrong model id or resource. Fix the code, do not retry.";
  if (error instanceof Anthropic.RateLimitError) return "429: slow down. Retry later with backoff.";
  if (error instanceof Anthropic.APIConnectionError) return "network problem. Safe to retry.";
  if (error instanceof Anthropic.APIError) return `API error ${error.status}: ${error.message}`;
  throw error; // not ours
}

async function apiErrorDemo() {
  // A 404: a model id that does not exist.
  await client.messages.create({ model: "claude-does-not-exist", max_tokens: 16, messages: [{ role: "user", content: "hi" }] }).catch((e) => console.log(explain(e)));
  // A 400: ending the history with an assistant turn (prefill) was removed on current Claude models.
  // Retrying would fail the same way every time.
  const prefill: Anthropic.MessageParam[] = [{ role: "user", content: "hi" }, { role: "assistant", content: "Hello" }];
  await client.messages.create({ model: MODEL, max_tokens: 16, messages: prefill }).catch((e) => console.log(explain(e)));
}

// 2. Tool errors: do not crash. Catch what the tool throws, return it with is_error, and let the model recover.
const DivideInput = z.object({ a: z.number(), b: z.number() });
function divide(raw: unknown): string {
  const { a, b } = DivideInput.parse(raw); // malformed input throws here too, and is handled the same way
  if (b === 0) throw new Error("division by zero");
  return String(a / b);
}

async function toolErrorDemo() {
  const divideTool: Anthropic.Tool = {
    name: "divide",
    description: "Divide a by b.",
    input_schema: { type: "object", properties: { a: { type: "number" }, b: { type: "number" } }, required: ["a", "b"] },
  };
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: "What is 10 divided by 0? Use the tool." }];

  const first = await client.messages.create({ model: MODEL, max_tokens: 16000, tools: [divideTool], messages });
  const call = first.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!call) return console.log("model did not call the tool");

  let result: Anthropic.ToolResultBlockParam;
  try {
    result = { type: "tool_result", tool_use_id: call.id, content: divide(call.input) };
  } catch (err) {
    result = { type: "tool_result", tool_use_id: call.id, is_error: true, content: `Error: ${err instanceof Error ? err.message : String(err)}` };
  }

  messages.push({ role: "assistant", content: first.content });
  messages.push({ role: "user", content: [result] });

  const final = await client.messages.create({ model: MODEL, max_tokens: 16000, tools: [divideTool], messages });
  console.log(final.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text);
}

await apiErrorDemo();
await toolErrorDemo();
