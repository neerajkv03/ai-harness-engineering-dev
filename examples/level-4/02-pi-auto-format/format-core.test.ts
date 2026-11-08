// Run: node --test examples/level-4/02-pi-auto-format/format-core.test.ts
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { formatFile, pathToFormat } from "./format-core.ts";

test("only successful edits and writes of formattable files are formatted", () => {
  assert.equal(pathToFormat("edit", { path: "src/a.ts" }, false), "src/a.ts");
  assert.equal(pathToFormat("write", { path: "@README.md" }, false), "README.md");
  assert.equal(pathToFormat("edit", { path: "src/a.ts" }, true), undefined); // failed edit
  assert.equal(pathToFormat("bash", { path: "src/a.ts" }, false), undefined); // wrong tool
  assert.equal(pathToFormat("write", { path: "image.png" }, false), undefined); // not formattable
  assert.equal(pathToFormat("write", null, false), undefined); // malformed input
});

test("reports a clear message when Prettier is not installed", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fmt-"));
  fs.writeFileSync(path.join(dir, "package.json"), "{}");
  const result = await formatFile(dir, "a.ts");
  assert.equal(result.ok, false);
  assert.match(result.message, /prettier is not installed/);
});
