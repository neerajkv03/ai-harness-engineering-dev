// Run: node --test examples/level-5/lib/tools.test.ts
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileTools } from "./tools.ts";

const writer = (dir: string, writable?: string[]) => fileTools(dir, { write: true, writable }).find((t) => t.name === "write_file")!;

test("writable limits write_file to the named files, so the agent cannot rewrite its own tests or scorecard", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "l5-tools-"));
  const write = writer(dir, ["slugify.ts"]);
  assert.match(await write.run({ file: "slugify.ts", content: "x" }), /wrote/);
  assert.match(await write.run({ file: "./slugify.ts", content: "x" }), /wrote/);
  await assert.rejects(async () => write.run({ file: "slugify.test.ts", content: "" }), /may only write slugify\.ts/);
  await assert.rejects(async () => write.run({ file: "feature_list.json", content: "[]" }), /may only write/);
});

test("read_file says what it cut and how to read the rest, and offset continues from there", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "l5-tools-"));
  fs.writeFileSync(path.join(dir, "big.txt"), "a".repeat(6000) + "TAIL");
  const read = fileTools(dir).find((t) => t.name === "read_file")!;
  const first = await read.run({ file: "big.txt" });
  assert.match(first, /\[truncated: showing 0-6000 of 6004 chars\. Call read_file with offset 6000 to continue\.\]/);
  assert.equal(await read.run({ file: "big.txt", offset: 6000 }), "TAIL");
});

test("without writable, any file inside the folder can be written (and nothing outside)", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "l5-tools-"));
  const write = writer(dir);
  assert.match(await write.run({ file: "a/b.ts", content: "x" }), /wrote/);
  await assert.rejects(async () => write.run({ file: "../escape.ts", content: "x" }), /outside the working folder/);
});
