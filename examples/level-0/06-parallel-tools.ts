// Lesson 0.2: one reply can contain several tool_use blocks. Run them together, answer in ONE user message.
// Run: bun run examples/level-0/06-parallel-tools.ts
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";

const getWeather: Anthropic.Tool = {
  name: "get_weather",
  description: "Get the current temperature in celsius for a city.",
  strict: true,
  input_schema: {
    type: "object",
    properties: { city: { type: "string" } },
    required: ["city"],
    additionalProperties: false,
  },
};

const Input = z.object({ city: z.string() });
async function runGetWeather(raw: unknown): Promise<string> {
  const { city } = Input.parse(raw);
  await new Promise((r) => setTimeout(r, 300)); // pretend this is a network call
  return JSON.stringify({ city, celsius: city.length + 10 }); // fake data
}

const messages: Anthropic.MessageParam[] = [
  { role: "user", content: "Compare the weather right now in Paris, Tokyo and Lima." },
];

const first = await client.messages.create({ model: MODEL, max_tokens: 1024, tools: [getWeather], messages });
const calls = first.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
console.log(`model asked for ${calls.length} tool calls in one turn`);

// Run all calls concurrently. This is plain Promise.all, like parallel DB queries.
const results: Anthropic.ToolResultBlockParam[] = await Promise.all(
  calls.map(async (call) => ({
    type: "tool_result" as const,
    tool_use_id: call.id,
    content: await runGetWeather(call.input),
  })),
);

messages.push({ role: "assistant", content: first.content });
messages.push({ role: "user", content: results }); // ALL results in ONE message

const final = await client.messages.create({ model: MODEL, max_tokens: 1024, tools: [getWeather], messages });
console.log(final.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text);
