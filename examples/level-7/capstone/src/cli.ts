// Run the harness from a terminal with Claude.
// Usage: bun run examples/level-7/capstone/src/cli.ts "your task" [--root path] [--trace file.jsonl] [--skills dir]
import { parseArgs } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import { createHarness } from "./harness.ts";
import type { Caller } from "./types.ts";

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: { root: { type: "string" }, trace: { type: "string" }, skills: { type: "string" } },
});
const task = positionals.join(" ");
if (!task) {
  console.error('Usage: cli.ts "your task" [--root path] [--trace file.jsonl] [--skills dir]');
  process.exit(1);
}

const client = new Anthropic();
const call: Caller = (req) =>
  // 16000: thinking is always on for Claude Opus 5.5 and counts toward max_tokens, so leave room for it.
  client.messages.create({ model: "claude-opus-5-5", max_tokens: 16000, system: req.system, messages: req.messages, ...(req.tools.length > 0 && { tools: req.tools }) });

const harness = createHarness({
  root: flags.root ?? process.cwd(),
  call,
  traceFile: flags.trace,
  skillsDir: flags.skills,
  compactAtTokens: 100_000,
  subagents: true,
  hooks: { beforeTool: ({ name, input }) => void console.error(`> ${name} ${JSON.stringify(input).slice(0, 120)}`) }, // a tiny live view
});

const result = await harness.run(task);
console.log(result.finished ? result.text : `(stopped after ${result.turns} turns without a final answer${result.stopReason ? `: ${result.stopReason}` : ""})`);
