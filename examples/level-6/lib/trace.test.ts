import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { runAgent, type Tool } from "../../level-5/lib/agent.ts";
import { scripted, textReply, toolReply } from "../../level-5/lib/fake-model.ts";
import { BATCH_FACTOR, costPerSolved, costUsd } from "./pricing.ts";
import { createTracer, jsonlSink, readTrace, summarizeTrace, type TraceEvent } from "./trace.ts";

const echo: Tool = { name: "echo", description: "", input_schema: { type: "object", properties: {} }, run: () => "hello" };
const broken: Tool = { name: "broken", description: "", input_schema: { type: "object", properties: {} }, run: () => { throw new Error("kaput"); } };

async function tracedRun() {
  const events: TraceEvent[] = [];
  const tracer = createTracer((e) => events.push(e));
  const call = scripted([
    toolReply([{ name: "echo", input: { a: 1 } }, { name: "broken", input: {} }], { input: 100, output: 20 }),
    textReply("done", { input: 100, output: 20 }),
  ]);
  const r = await runAgent({ system: "s", task: "t", call: tracer.call(call), tools: tracer.tools([echo, broken]) });
  return { events, r };
}

test("records every model call and tool call with the turn it belongs to", async () => {
  const { events, r } = await tracedRun();
  assert.equal(r.text, "done"); // tracing does not change behavior
  assert.deepEqual(events.map((e) => e.type), ["model", "tool", "tool", "model"]);
  const tools = events.filter((e) => e.type === "tool");
  assert.ok(tools.every((t) => t.turn === 1), "tool calls belong to the turn that requested them");
  assert.equal((events[3] as { turn: number }).turn, 2);
});

test("a failing tool is logged as not ok and the error still reaches the agent loop", async () => {
  const { events } = await tracedRun();
  const b = events.find((e) => e.type === "tool" && e.name === "broken");
  assert.ok(b && b.type === "tool");
  assert.equal(b.ok, false);
  assert.equal(b.error, "kaput");
});

test("summarizeTrace totals tokens, cost and per-tool stats", async () => {
  const { events } = await tracedRun();
  const s = summarizeTrace(events, "claude-opus-5-5");
  assert.equal(s.turns, 2);
  assert.equal(s.toolCalls, 2);
  assert.deepEqual(s.usage, { input: 200, output: 40, cacheRead: 0, cacheWrite: 0 });
  assert.equal(s.costUsd, (200 * 4 + 40 * 20) / 1e6);
  assert.deepEqual(s.byTool.echo && { count: s.byTool.echo.count, errors: s.byTool.echo.errors }, { count: 1, errors: 0 });
  assert.equal(s.byTool.broken?.errors, 1);
});

test("a trace survives a round trip through a JSONL file", async () => {
  const { events } = await tracedRun();
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "trace-")), "run.jsonl");
  const sink = jsonlSink(file);
  events.forEach(sink);
  const back = readTrace(file);
  assert.equal(back.length, events.length);
  assert.equal(back[1]!.type, "tool");
  assert.equal(fs.readFileSync(file, "utf8").trim().split("\n").length, events.length);
});

test("pricing: one million tokens of each kind on Claude Opus 5.5", () => {
  assert.equal(costUsd("claude-opus-5-5", { input: 1e6, output: 0 }), 4);
  assert.equal(costUsd("claude-opus-5-5", { input: 0, output: 1e6 }), 20);
  assert.equal(costUsd("claude-opus-5-5", { input: 0, output: 0, cacheRead: 1e6 }), 0.2);
  assert.equal(costUsd("claude-opus-5-5", { input: 0, output: 0, cacheWrite5m: 1e6 }), 5);
  assert.equal(costUsd("claude-opus-5-5", { input: 0, output: 0, cacheWrite1h: 1e6 }), 8);
  assert.throws(() => costUsd("claude-nope", { input: 1, output: 1 }), /no price/);
});

test("cost per solved task: a cheaper model that fails more can cost more per solve", () => {
  assert.ok(costPerSolved(0.1, 0.5) > costPerSolved(0.15, 0.95));
  assert.equal(costPerSolved(1, 0), Infinity);
  assert.equal(BATCH_FACTOR, 0.5);
});
