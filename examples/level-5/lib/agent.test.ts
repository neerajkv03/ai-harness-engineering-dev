// Run: node --test examples/level-5/lib/*.test.ts      (or: bun test examples/level-5/lib)
import assert from "node:assert/strict";
import { test } from "node:test";
import { delegateTool, runAgent, type Tool } from "./agent.ts";
import { scripted, textReply, toolReply } from "./fake-model.ts";

const echo: Tool = {
  name: "echo",
  description: "Echo text",
  input_schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
  run: (input) => `echo: ${(input as { text: string }).text}`,
};

test("returns the final text with turn and token counts", async () => {
  const call = scripted([textReply("hello", { input: 50, output: 7 })]);
  const r = await runAgent({ system: "s", task: "t", call });
  assert.equal(r.text, "hello");
  assert.equal(r.turns, 1);
  assert.equal(r.inputTokens, 50);
  assert.equal(r.outputTokens, 7);
  assert.equal(r.finished, true);
});

test("runs a tool and sends the result back with the matching id", async () => {
  const call = scripted([toolReply([{ name: "echo", input: { text: "hi" } }]), textReply("done")]);
  const r = await runAgent({ system: "s", task: "t", call, tools: [echo] });
  assert.equal(r.text, "done");
  // messages: user task, assistant tool_use, user tool_result, assistant final text. The result is second to last.
  const last = r.messages.at(-2)!.content as unknown as { type: string; tool_use_id: string; content: string }[];
  assert.equal(last[0]!.type, "tool_result");
  assert.equal(last[0]!.content, "echo: hi");
  assert.ok(last[0]!.tool_use_id.startsWith("toolu_"));
});

test("an unknown tool or a throwing tool becomes an is_error result, not a crash", async () => {
  const boom: Tool = { ...echo, name: "boom", run: () => { throw new Error("kaput"); } };
  const call = scripted([toolReply([{ name: "nope", input: {} }, { name: "boom", input: {} }]), textReply("recovered")]);
  const r = await runAgent({ system: "s", task: "t", call, tools: [boom] });
  assert.equal(r.text, "recovered");
  const results = r.messages.at(-2)!.content as unknown as { is_error?: boolean; content: string }[];
  assert.equal(results.length, 2);
  assert.ok(results.every((x) => x.is_error));
  assert.match(results[0]!.content, /unknown tool "nope"/);
  assert.match(results[1]!.content, /kaput/);
});

test("stops at maxTurns and reports it did not finish", async () => {
  const call = scripted(Array.from({ length: 3 }, () => toolReply([{ name: "echo", input: { text: "x" } }])));
  const r = await runAgent({ system: "s", task: "t", call, tools: [echo], maxTurns: 3 });
  assert.equal(r.finished, false);
  assert.equal(r.turns, 3);
});

test("beforeTool can abort the whole run by throwing", async () => {
  const call = scripted([toolReply([{ name: "echo", input: { text: "x" } }])]);
  await assert.rejects(
    runAgent({ system: "s", task: "t", call, tools: [echo], beforeTool: () => { throw new Error("stop"); } }),
    /stop/,
  );
});

test("delegate: the helper's work stays out of the main agent's context", async () => {
  const BIG_FILE = "SECRET-FILE-CONTENT ".repeat(500);
  const reader: Tool = { ...echo, name: "read_file", run: () => BIG_FILE };

  // The helper reads a big file, then reports briefly.
  const helperCall = scripted([toolReply([{ name: "read_file", input: { text: "x" } }]), textReply("The file is just filler text.")]);
  let helperResult: { turns: number } | undefined;
  const delegate = delegateTool({ call: helperCall, system: "helper", tools: [reader], onResult: (r) => (helperResult = r) });

  const brief = "Goal: summarize big.txt. Scope: that one file only. Skip: everything else. Output: one sentence.";
  const mainCall = scripted([toolReply([{ name: "delegate", input: { task: brief } }]), textReply("Done: it is filler.")]);
  const main = await runAgent({ system: "main", task: "What is in big.txt?", call: mainCall, tools: [delegate] });

  assert.equal(main.text, "Done: it is filler.");
  assert.equal(helperResult?.turns, 2);
  const mainTranscript = JSON.stringify(main.messages);
  assert.ok(!mainTranscript.includes("SECRET-FILE-CONTENT"), "the helper's file read must not appear in the main context");
  assert.ok(mainTranscript.includes("The file is just filler text."), "only the helper's report comes back");
});

test("delegate: a thin brief is rejected with advice the model can act on", async () => {
  const delegate = delegateTool({ call: scripted([]), system: "helper", tools: [] });
  await assert.rejects(Promise.resolve(delegate.run({ task: "fix it" })), /too short/);
});
