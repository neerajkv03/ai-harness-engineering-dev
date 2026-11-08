// Lesson 5.1: a subagent is a fresh context with a narrow job. Only its final report returns to the main agent.
// Run: bun run examples/level-5/01-subagent.ts [folder]      (default: the current folder)
import path from "node:path";
import { anthropicCaller, delegateTool, runAgent } from "./lib/agent.ts";
import { fileTools } from "./lib/tools.ts";

const call = anthropicCaller();
const root = path.resolve(process.argv[2] ?? ".");

const HELPER_SYSTEM = [
  "You are a research helper. You can list and read files. You cannot change anything.",
  "Answer ONLY the task you were given, in the output format it asks for. Be concrete: name files and functions.",
  "If you cannot find something, say so plainly instead of guessing.",
].join("\n");

const MAIN_SYSTEM = [
  "You coordinate. You cannot read files yourself. For any investigation, call `delegate`.",
  "A helper knows ONLY what you write in `task`. Write a full brief: the goal, the scope (which folders), what to skip,",
  "and the exact output format you want back (for example: 'a bullet list of file paths with one line each').",
].join("\n");

let helperTokens = 0;
const delegate = delegateTool({
  call,
  system: HELPER_SYSTEM,
  tools: fileTools(root), // read-only: the helper gets fewer powers than a full agent
  onResult: (r) => { helperTokens += r.inputTokens + r.outputTokens; },
});

const main = await runAgent({
  system: MAIN_SYSTEM,
  task: "Where in this project is the list of lessons assembled for the learning site, and how does the site choose which lesson to show? Answer in 3 sentences.",
  tools: [delegate],
  call,
  maxTurns: 6,
});

console.log(main.text);
console.log("\n--- cost of isolation ---");
console.log(`main agent:   ${main.turns} turns, ${main.inputTokens + main.outputTokens} tokens, ${main.messages.length} messages in its context`);
console.log(`helper agent: ${helperTokens} tokens (its file reads never entered the main context)`);
