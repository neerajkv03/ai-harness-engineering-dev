// Lesson 0.2: a tool is a name + description + JSON Schema. The model only ever returns a request to call it.
// Run: bun run examples/level-0/04-tool-definition.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";

// Same idea as a Zod schema: z.object({ city: z.string(), unit: z.enum(["celsius", "fahrenheit"]) }).
// The `description` is the API documentation the model reads. Write it for a reader who has never seen your code.
const getWeather: Anthropic.Tool = {
  name: "get_weather",
  description: "Get the current temperature for a city. Use when the user asks about weather or temperature.",
  strict: true, // the model's input is guaranteed to match the schema
  input_schema: {
    type: "object",
    properties: {
      city: { type: "string", description: "City name, e.g. 'Paris'" },
      unit: { type: "string", enum: ["celsius", "fahrenheit"] },
    },
    required: ["city", "unit"],
    additionalProperties: false,
  },
};

const response = await client.messages.create({
  model: MODEL,
  max_tokens: 16000,
  tools: [getWeather],
  messages: [{ role: "user", content: "How warm is it in Paris, in celsius?" }],
});

console.log("stop_reason:", response.stop_reason); // "tool_use": the model wants YOU to run something
for (const block of response.content) {
  if (block.type === "tool_use") {
    console.log("tool request:", block.name, JSON.stringify(block.input), "id:", block.id);
  }
}
// Nothing has been executed. The model only wrote a request. Next file: run it and send the result back.
