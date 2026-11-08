import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { analyze } from "./analyze.ts";
import { READ_CAP, configSource, gradeConfig, runStaged } from "./staged-failure.ts";
import type { TraceEvent } from "./trace.ts";

const tool = (turn: number, name: string, input: unknown, o: { ok?: boolean; truncated?: boolean; outputChars?: number; error?: string } = {}): TraceEvent => ({
  type: "tool", turn, name, input, ms: 1, ok: o.ok ?? true, outputChars: o.outputChars ?? 10, truncated: o.truncated ?? false, ...(o.error && { error: o.error }),
});
const kinds = (events: TraceEvent[], opts = {}) => analyze(events, opts).map((f) => f.kind);

test("a healthy run has no findings", () => {
  const events = [tool(1, "read_file", { file: "a.ts" }), tool(2, "replace_in_file", { file: "a.ts" }), tool(3, "run_checks", {})];
  assert.deepEqual(kinds(events), []);
});

test("loop: the same call three times, even with reordered keys", () => {
  const events = [tool(1, "search", { q: "x", n: 1 }), tool(2, "search", { n: 1, q: "x" }), tool(3, "search", { q: "x", n: 1 })];
  assert.deepEqual(kinds(events), ["loop"]);
});

test("repeated error: the same tool failing twice in a row", () => {
  const events = [tool(1, "run_checks", {}, { ok: false, error: "bad date" }), tool(2, "run_checks", {}, { ok: false, error: "bad date" })];
  const f = analyze(events);
  assert.equal(f[0]!.kind, "repeated_error");
  assert.match(f[0]!.evidence, /bad date/);
});

test("write after a read that said it was truncated", () => {
  const events = [tool(1, "read_file", { file: "c.ts" }, { truncated: true, outputChars: 6050 }), tool(2, "write_file", { file: "c.ts" }), tool(3, "run_checks", {})];
  assert.deepEqual(kinds(events), ["write_after_truncated_read"]);
});

test("write after a SILENT truncation is caught by the size cap", () => {
  const events = [tool(1, "read_file", { file: "c.ts" }, { outputChars: 6000 }), tool(2, "write_file", { file: "c.ts" }), tool(3, "run_checks", {})];
  assert.deepEqual(kinds(events), [], "without knowing the cap there is nothing to see");
  assert.deepEqual(kinds(events, { readCap: 6000 }), ["write_after_truncated_read"]);
});

test("reading the rest after a truncated read clears the finding", () => {
  const events = [
    tool(1, "read_file", { file: "c.ts" }, { truncated: true, outputChars: 6050 }),
    tool(2, "read_file", { file: "c.ts", offset: 6000 }, { outputChars: 900 }),
    tool(3, "write_file", { file: "c.ts" }),
    tool(4, "run_checks", {}),
  ];
  assert.deepEqual(kinds(events), []);
});

test("an edit with no check afterwards is flagged, and a check before the edit does not count", () => {
  assert.deepEqual(kinds([tool(1, "run_checks", {}), tool(2, "replace_in_file", { file: "a.ts" })]), ["unverified_edit"]);
});

test("running out of turns is flagged", () => {
  assert.deepEqual(kinds([{ type: "run_end", finished: false, turns: 8 }]), ["ran_out_of_turns"]);
});

test("the staged silent-truncation run: the harness really destroys the file, and the analyzer says why", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "staged-"));
  const events: TraceEvent[] = [];
  const text = await runStaged("silent", dir, (e) => events.push(e));

  assert.match(text, /Done/); // the agent confidently reports success...
  const graded = gradeConfig(dir);
  assert.equal(graded.pass, false); // ...but the file lost the settings after the cap
  assert.match(graded.detail, /MAX_CONNECTIONS/);
  assert.match(graded.detail, /REGION/);

  const found = analyze(events, { readCap: READ_CAP });
  assert.deepEqual(found.map((f) => f.kind).sort(), ["unverified_edit", "write_after_truncated_read"]);
  assert.match(found.find((f) => f.kind === "write_after_truncated_read")!.fix, /pointer/i);
});

test("the staged pointer run: same task, fixed tool, clean file and a clean trace", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "staged-"));
  const events: TraceEvent[] = [];
  await runStaged("pointer", dir, (e) => events.push(e));
  assert.deepEqual(gradeConfig(dir), { pass: true, detail: "ok" });
  assert.deepEqual(analyze(events, { readCap: READ_CAP }), []);
});

test("the config file really is longer than the read cap, with the setting after it", () => {
  const text = configSource();
  assert.ok(text.indexOf("TIMEOUT_MS") > READ_CAP);
});
