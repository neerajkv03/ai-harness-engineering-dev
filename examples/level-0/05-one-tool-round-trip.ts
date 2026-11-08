// Lesson 0.2: the full round trip. request -> tool_use -> you run it -> tool_result -> final answer.
// Run: bun run examples/level-0/05-one-tool-round-trip.ts
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";

const getWeather: Anthropic.Tool = {
  name: "get_weather",
  description: "Get the current temperature for a city.",
  strict: true,
  input_schema: {
    type: "object",
    properties: { city: { type: "string" }, unit: { type: "string", enum: ["celsius", "fahrenheit"] } },
    required: ["city", "unit"],
    additionalProperties: false,
  },
};

// Your real code. Here it is fake data.
const WeatherInput = z.object({ city: z.string(), unit: z.enum(["celsius", "fahrenheit"]) });
function runGetWeather(raw: unknown): string {
  const { city, unit } = WeatherInput.parse(raw); // never trust tool input; validate it like a request body
  return JSON.stringify({ city, temperature: unit === "celsius" ? 18 : 64, unit });
}

const messages: Anthropic.MessageParam[] = [{ role: "user", content: "How warm is it in Paris, in celsius?" }];

const first = await client.messages.create({ model: MODEL, max_tokens: 16000, tools: [getWeather], messages });
if (first.stop_reason !== "tool_use") throw new Error(`expected tool_use, got ${first.stop_reason}`);

const toolUse = first.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
if (!toolUse) throw new Error("no tool_use block");

const result: Anthropic.ToolResultBlockParam = {
  type: "tool_result",
  tool_use_id: toolUse.id, // must match the id of the request
  content: runGetWeather(toolUse.input),
};

// Append the assistant turn exactly as returned, then your result as a user turn.
messages.push({ role: "assistant", content: first.content });
messages.push({ role: "user", content: [result] });

const final = await client.messages.create({ model: MODEL, max_tokens: 16000, tools: [getWeather], messages });
console.log(final.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text);
