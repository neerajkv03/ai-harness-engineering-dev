// Lesson 2.1: see where your context tokens go. System prompt, tool definitions and history all count, every turn.
// Run: bun run examples/level-2/01-inspect-context.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";

const system = [
  "You are a coding agent working inside the user's repository.",
  "Read files before editing them. Make the smallest change that fixes the problem.",
  "Run the project's tests after every change and show the output.",
  "Never edit files under /generated. Never touch .env files.",
  "When you are unsure, ask one short question instead of guessing.",
].join("\n");

const tools: Anthropic.Tool[] = [
  {
    name: "read_file",
    description: "Read a text file from the repository. Path is relative to the repo root.",
    input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  },
  {
    name: "search_code",
    description: "Search the repository for a regular expression. Returns matching lines with file paths.",
    input_schema: { type: "object", properties: { pattern: { type: "string" } }, required: ["pattern"] },
  },
  {
    name: "run_tests",
    description: "Run the project's test suite and return the output.",
    input_schema: { type: "object", properties: {} },
  },
];

// A tool result is just text in the history. Here, the contents of a 120-line file the agent read earlier.
const fileContents = Array.from({ length: 120 }, (_, i) => `export const route${i} = router.get("/r${i}", handler${i});`).join("\n");

const history: Anthropic.MessageParam[] = [
  { role: "user", content: "Why does GET /r7 return 404?" },
  { role: "assistant", content: "Let me read the routes file." },
  { role: "user", content: `Result of read_file("src/routes.ts"):\n${fileContents}` },
  { role: "assistant", content: "Route /r7 is registered, so the problem is probably in the middleware." },
  { role: "user", content: "Check the middleware order too." },
];

const count = async (p: { system?: string; tools?: Anthropic.Tool[]; messages: Anthropic.MessageParam[] }) =>
  (await client.messages.countTokens({ model: MODEL, ...p })).input_tokens;

const ping: Anthropic.MessageParam[] = [{ role: "user", content: "hi" }];
const baseline = await count({ messages: ping });
const systemTokens = (await count({ system, messages: ping })) - baseline;
const toolTokens = (await count({ tools, messages: ping })) - baseline;
const historyTokens = (await count({ messages: history })) - baseline;
const total = await count({ system, tools, messages: history });

const rows: [string, number][] = [
  ["system prompt", systemTokens],
  ["tool definitions", toolTokens],
  ["history (incl. file read)", historyTokens],
  ["baseline framing", baseline],
];
for (const [label, n] of rows) {
  console.log(`${label.padEnd(28)} ${String(n).padStart(6)} tokens  ${((n / total) * 100).toFixed(0).padStart(3)}%`);
}
console.log(`${"total sent this turn".padEnd(28)} ${String(total).padStart(6)} tokens`);
// The parts are measured separately, so they add up to the total only approximately.
// Notice how one file read dwarfs the system prompt. Tool results are usually the biggest line.
