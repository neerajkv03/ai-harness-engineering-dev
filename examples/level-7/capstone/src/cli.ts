// Run the harness from a terminal with Claude.
// Usage: bun run examples/level-7/capstone/src/cli.ts "your task" [--root path] [--trace file.jsonl] [--skills dir]
import Anthropic from "@anthropic-ai/sdk";
import { createHarness } from "./harness.ts";
import type { Caller } from "./types.ts";

const args = process.argv.slice(2);
const flag = (name: string) => args[args.indexOf(`--${name}`) + 1];
const task = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!task) {
  console.error('Usage: cli.ts "your task" [--root path] [--trace file.jsonl] [--skills dir]');
  process.exit(1);
}

const client = new Anthropic();
const call: Caller = (req) =>
  client.messages.create({ model: "claude-opus-5-5", max_tokens: 4096, system: req.system, messages: req.messages, ...(req.tools.length > 0 && { tools: req.tools }) });

const harness = createHarness({
  root: flag("root") ?? process.cwd(),
  call,
  traceFile: flag("trace"),
  skillsDir: flag("skills"),
  compactAtTokens: 100_000,
  subagents: true,
  hooks: { beforeTool: ({ name, input }) => void console.error(`> ${name} ${JSON.stringify(input).slice(0, 120)}`) }, // a tiny live view
});

const result = await harness.run(task);
console.log(result.finished ? result.text : `(stopped after ${result.turns} turns without a final answer)`);
