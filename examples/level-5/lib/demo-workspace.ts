// A tiny project used by the pipeline and long-running examples: tests exist, implementations do not.
// The tests are the spec. The agent must write slugify.ts, clamp.ts and chunk.ts.
import fs from "node:fs";
import path from "node:path";
import type { Feature } from "./progress.ts";

export const FEATURES: Feature[] = [
  {
    id: "slugify",
    description: "export function slugify(s) in slugify.ts: lowercase, turn each run of non-alphanumeric characters into one '-', no leading or trailing '-'.",
    test: "node --test slugify.test.ts",
    passes: false,
  },
  {
    id: "clamp",
    description: "export function clamp(n, min, max) in clamp.ts: limit n to the range. Throw a RangeError if min is greater than max.",
    test: "node --test clamp.test.ts",
    passes: false,
  },
  {
    id: "chunk",
    description: "export function chunk(items, size) in chunk.ts: split an array into arrays of at most `size`. Throw a RangeError if size is less than 1.",
    test: "node --test chunk.test.ts",
    passes: false,
  },
];

const header = (name: string) => `import assert from "node:assert/strict";\nimport { test } from "node:test";\nimport { ${name} } from "./${name}.ts";\n`;

export const TEST_FILES: Record<string, string> = {
  "slugify.test.ts":
    header("slugify") +
    `test("lowercases and hyphenates", () => assert.equal(slugify("Hello World"), "hello-world"));
test("collapses runs and trims", () => assert.equal(slugify("  --Hello,   World!--  "), "hello-world"));
test("only symbols gives empty string", () => assert.equal(slugify("!!!"), ""));
`,
  "clamp.test.ts":
    header("clamp") +
    `test("inside the range", () => assert.equal(clamp(5, 0, 10), 5));
test("below and above", () => { assert.equal(clamp(-1, 0, 10), 0); assert.equal(clamp(11, 0, 10), 10); });
test("bad range throws", () => assert.throws(() => clamp(1, 10, 0), RangeError));
`,
  "chunk.test.ts":
    header("chunk") +
    `test("splits evenly and with a remainder", () => {
  assert.deepEqual(chunk([1, 2, 3, 4], 2), [[1, 2], [3, 4]]);
  assert.deepEqual(chunk([1, 2, 3], 2), [[1, 2], [3]]);
});
test("empty input", () => assert.deepEqual(chunk([], 3), []));
test("size below 1 throws", () => assert.throws(() => chunk([1], 0), RangeError));
`,
};

/** Create the workspace: the failing tests and a fresh feature list. Existing implementations are left alone. */
export function seedWorkspace(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(TEST_FILES)) fs.writeFileSync(path.join(dir, name), content);
  fs.writeFileSync(path.join(dir, "feature_list.json"), JSON.stringify(FEATURES, null, 2) + "\n");
}
