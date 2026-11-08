// Run: node --test examples/level-7/lib/*.test.ts      (or: bun test examples/level-7/lib)
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { mapHarness, scoreText } from "./harness-map.ts";

function fixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "harness-map-"));
  const put = (rel: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  };
  put("src/agent-loop.ts", "while (turn < maxTurns) { const res = await call(); if (res.stop_reason !== 'tool_use') break; }");
  put("src/compaction.ts", "export function compact(messages) { /* summarize old turns, keep AGENTS.md in the system prompt */ }");
  put("src/permissions.ts", "const policy = { allowlist: [], denylist: [] }; function approve() {} // sandbox and trust checks");
  put("src/subagent.ts", "export function spawn() { /* delegate to a subagent worker */ }");
  put("src/extensions/loader.ts", "// load each extension, skill and plugin from the manifest; hook into mcp");
  put("src/ui/tui.ts", "// terminal ui: reads stdin, writes stdout, speaks jsonl over rpc");
  put("node_modules/big/index.ts", "stop_reason ".repeat(1000)); // must be ignored
  put("src/agent-loop.test.ts", "stop_reason ".repeat(1000)); // tests must be ignored
  return root;
}

test("each subsystem's top file is the one you would expect", () => {
  const map = mapHarness(fixture());
  assert.equal(map["agent loop"][0]!.file, "src/agent-loop.ts");
  assert.equal(map["memory and context"][0]!.file, "src/compaction.ts");
  assert.equal(map["safety and permissions"][0]!.file, "src/permissions.ts");
  assert.equal(map["orchestration"][0]!.file, "src/subagent.ts");
  assert.equal(map["extensibility"][0]!.file, "src/extensions/loader.ts");
  assert.equal(map["interface layer"][0]!.file, "src/ui/tui.ts");
});

test("dependency folders and test files are skipped", () => {
  const files = Object.values(mapHarness(fixture())).flat().map((f) => f.file);
  assert.ok(files.every((f) => !f.includes("node_modules") && !f.includes(".test.")));
});

test("a file's path counts as evidence", () => {
  assert.ok(scoreText("nothing relevant", "src/compaction.ts", ["compact"]) > 0);
});

test("density beats raw count: a small focused file outranks a big file that mentions the word once", () => {
  const root = fixture();
  fs.writeFileSync(path.join(root, "src/huge.ts"), "// stop_reason\n" + "const x = 1;\n".repeat(20_000));
  assert.equal(mapHarness(root)["agent loop"][0]!.file, "src/agent-loop.ts");
});
