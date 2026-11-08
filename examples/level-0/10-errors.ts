// Lesson 0.3: two kinds of failure. API errors (you handle them) and tool errors (the model handles them).
// Run: bun run examples/level-0/10-errors.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // the SDK already retries 408/409/429/5xx twice (maxRetries: 2)
const MODEL = "claude-opus-5-5";

// 1. API errors: check the most specific class first.
async function apiErrorDemo() {
  try {
    await client.messages.create({
      model: "claude-does-not-exist",
      max_tokens: 16,
      messages: [{ role: "user", content: "hi" }],
    });
  } catch (error) {
    if (error instanceof Anthropic.NotFoundError) {
      console.log("404: wrong model id or resource. Fix the code, do not retry.");
    } else if (error instanceof Anthropic.RateLimitError) {
      console.log("429: slow down. Retry later with backoff.");
    } else if (error instanceof Anthropic.AuthenticationError) {
      console.log("401: bad or missing API key.");
    } else if (error instanceof Anthropic.APIConnectionError) {
      console.log("network problem. Safe to retry.");
    } else if (error instanceof Anthropic.APIError) {
      console.log(`API error ${error.status}: ${error.message}`);
    } else {
      throw error; // not ours
    }
  }
}

// 2. Tool errors: do not crash. Return is_error and let the model recover.
async function toolErrorDemo() {
  const divide: Anthropic.Tool = {
    name: "divide",
    description: "Divide a by b.",
    input_schema: {
      type: "object",
      properties: { a: { type: "number" }, b: { type: "number" } },
      required: ["a", "b"],
    },
  };
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: "What is 10 divided by 0? Use the tool." }];

  const first = await client.messages.create({ model: MODEL, max_tokens: 1024, tools: [divide], messages });
  const call = first.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!call) return console.log("model did not call the tool");

  messages.push({ role: "assistant", content: first.content });
  messages.push({
    role: "user",
    content: [{ type: "tool_result", tool_use_id: call.id, is_error: true, content: "Error: division by zero" }],
  });

  const final = await client.messages.create({ model: MODEL, max_tokens: 1024, tools: [divide], messages });
  console.log(final.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text);
}

await apiErrorDemo();
await toolErrorDemo();
