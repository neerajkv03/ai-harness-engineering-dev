// Lesson 3.4: keep a big tool catalog out of the context window. Deferred tools load only when the model searches for them.
// Run: bun run examples/level-3/05-tool-search.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const response = await client.messages.create({
  model: "claude-opus-5-5",
  max_tokens: 16000,
  messages: [{ role: "user", content: "What is the weather in San Francisco?" }],
  tools: [
    // The search tool itself must NOT be deferred. At least one tool has to be non-deferred.
    { type: "tool_search_tool_regex_20251119", name: "tool_search_tool_regex" },
    {
      name: "get_weather",
      description: "Get the weather at a specific location",
      input_schema: {
        type: "object",
        properties: { location: { type: "string" }, unit: { type: "string", enum: ["celsius", "fahrenheit"] } },
        required: ["location"],
      },
      defer_loading: true, // not in the context at all until a search returns it; then its full definition loads
    },
    {
      name: "search_files",
      description: "Search through files in the workspace",
      input_schema: {
        type: "object",
        properties: { query: { type: "string" }, file_types: { type: "array", items: { type: "string" } } },
        required: ["query"],
      },
      defer_loading: true,
    },
  ],
});

// Block types show the story: the model searches the catalog first, then calls the tool it found.
console.log(response.content.map((b) => b.type));
