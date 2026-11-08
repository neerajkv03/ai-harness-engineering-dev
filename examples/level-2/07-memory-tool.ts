// Lesson 2.4: the API-native version. Claude's memory tool plus the SDK's helper do the file handling for you.
// Run: bun run examples/level-2/07-memory-tool.ts
import Anthropic from "@anthropic-ai/sdk";
import { betaMemoryTool } from "@anthropic-ai/sdk/helpers/beta/memory";
import { BetaLocalFilesystemMemoryTool } from "@anthropic-ai/sdk/tools/memory/node";
import path from "node:path";

const client = new Anthropic();

// The backend stores files under ./memory-demo-api and rejects paths that escape /memories.
// You can pass your own handlers instead (a database, S3) as long as they stay inside /memories.
const backend = await BetaLocalFilesystemMemoryTool.init(path.join(import.meta.dirname, "memory-demo-api"));
const memory = betaMemoryTool(backend);

const runner = client.beta.messages.toolRunner({
  model: "claude-opus-5-5",
  max_tokens: 16000,
  messages: [{ role: "user", content: "Remember that customer Acme Corp prefers email follow-ups." }],
  tools: [memory],
  max_iterations: 10, // always cap the loop
});

const finalMessage = await runner;
console.log(finalMessage.content);
// Claude checks /memories before starting a task and writes there as it learns. Your code only provides storage.
