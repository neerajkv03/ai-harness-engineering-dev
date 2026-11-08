// Lesson 6.2: trace an agent run. Every model call and tool call becomes one JSON line, then we summarize the file.
// Run: bun run examples/level-6/03-trace-run.ts      (no API key needed: a scripted model plays the agent)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runAgent, type Tool } from "../level-5/lib/agent.ts";
import { scripted, textReply, toolReply } from "../level-5/lib/fake-model.ts";
import { createTracer, jsonlSink, readTrace, summarizeTrace } from "./lib/trace.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const tools: Tool[] = [
  { name: "search", description: "Search the code", input_schema: { type: "object", properties: { q: { type: "string" } } }, run: async () => { await sleep(30); return "src/auth.ts:12: verifyToken()"; } },
  { name: "read_file", description: "Read a file", input_schema: { type: "object", properties: { file: { type: "string" } } }, run: async () => { await sleep(120); return "export function verifyToken() {}"; } },
  { name: "run_checks", description: "Run the tests", input_schema: { type: "object", properties: {} }, run: async () => { await sleep(300); throw new Error("2 tests failed"); } },
];

const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "trace-run-")), "run.jsonl");
const tracer = createTracer(jsonlSink(file));

// A scripted "model": three tool calls, then an answer. Usage numbers are what a real response would report.
const model = scripted([
  toolReply([{ name: "search", input: { q: "verifyToken" } }], { input: 1800, output: 40 }),
  toolReply([{ name: "read_file", input: { file: "src/auth.ts" } }], { input: 2100, output: 35 }),
  toolReply([{ name: "run_checks", input: {} }], { input: 2600, output: 30 }),
  textReply("The tests fail. verifyToken() is empty.", { input: 2900, output: 60 }),
]);

await runAgent({ system: "You debug code.", task: "Why do the auth tests fail?", call: tracer.call(model), tools: tracer.tools(tools) });

console.log(`trace file: ${file}\n`);
console.log("first lines of the file:");
fs.readFileSync(file, "utf8").split("\n").slice(0, 3).forEach((l) => console.log("  " + l.slice(0, 150)));

const s = summarizeTrace(readTrace(file), "claude-opus-5-5");
console.log(`\nturns: ${s.turns}   tool calls: ${s.toolCalls}`);
console.log(`tokens: ${s.usage.input} in, ${s.usage.output} out   cost on Claude Opus 5.5: $${s.costUsd.toFixed(4)}`);
console.log(`time in model calls: ${s.modelMs} ms   time in tools: ${s.toolMs} ms`);
console.log(`slowest tool: ${s.slowestTool?.name} (${s.slowestTool?.ms} ms)`);
for (const [name, t] of Object.entries(s.byTool)) console.log(`  ${name.padEnd(10)} calls ${t.count}  errors ${t.errors}  total ${t.totalMs.toFixed(0)} ms  ~${t.estTokens} tokens of results`);
