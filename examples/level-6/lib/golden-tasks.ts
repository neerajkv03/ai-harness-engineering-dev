// A golden task set: ten small, unambiguous coding tasks. Each one has a grader that checks the OUTCOME in the folder.
// Anthropic's advice: 20-50 simple tasks drawn from real failures is a great start. Start with ten and grow it.
import fs from "node:fs";
import path from "node:path";
import { runGate } from "../../level-5/lib/patterns.ts";
import type { Task } from "./eval.ts";

const header = (fn: string) => `import assert from "node:assert/strict";\nimport { test } from "node:test";\nimport { ${fn} } from "./${fn}.ts";\n`;

/** Tests are the spec. The agent writes `<name>.ts`, the grader runs `<name>.test.ts`. */
function implementTask(fn: string, spec: string, tests: string): Task & { reference: Record<string, string> } {
  return {
    id: fn,
    prompt: `Implement ${fn} in ${fn}.ts so that ${fn}.test.ts passes. ${spec} You cannot run the tests, so read them carefully first.`,
    setup: (dir) => fs.writeFileSync(path.join(dir, `${fn}.test.ts`), header(fn) + tests),
    grade: async (dir) => {
      const r = await runGate("node", ["--test", `${fn}.test.ts`], dir);
      return { pass: r.ok, detail: r.ok ? "tests pass" : r.output.slice(-200) };
    },
    reference: {},
  };
}

const withRef = <T extends { reference: Record<string, string> }>(t: T, file: string, code: string): T => ((t.reference[file] = code), t);

const implement = [
  withRef(
    implementTask("slugify", "Lowercase; each run of non-alphanumeric characters becomes one '-'; no leading or trailing '-'.", `test("basic", () => { assert.equal(slugify("Hello World"), "hello-world"); assert.equal(slugify("  --A,  B!--  "), "a-b"); assert.equal(slugify("!!!"), ""); });\n`),
    "slugify.ts",
    `export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");\n`,
  ),
  withRef(
    implementTask("clamp", "Limit n to the range min..max. Throw a RangeError if min is greater than max.", `test("clamp", () => { assert.equal(clamp(5, 0, 10), 5); assert.equal(clamp(-1, 0, 10), 0); assert.equal(clamp(11, 0, 10), 10); assert.throws(() => clamp(1, 10, 0), RangeError); });\n`),
    "clamp.ts",
    `export function clamp(n: number, min: number, max: number) { if (min > max) throw new RangeError("min > max"); return Math.min(Math.max(n, min), max); }\n`,
  ),
  withRef(
    implementTask("chunk", "Split an array into arrays of at most `size`. Throw a RangeError if size is less than 1.", `test("chunk", () => { assert.deepEqual(chunk([1, 2, 3], 2), [[1, 2], [3]]); assert.deepEqual(chunk([], 3), []); assert.throws(() => chunk([1], 0), RangeError); });\n`),
    "chunk.ts",
    `export function chunk<T>(a: T[], size: number): T[][] { if (size < 1) throw new RangeError("size"); const o: T[][] = []; for (let i = 0; i < a.length; i += size) o.push(a.slice(i, i + size)); return o; }\n`,
  ),
  withRef(
    implementTask("unique", "Return the items of an array without duplicates, keeping the first occurrence of each, in order.", `test("unique", () => { assert.deepEqual(unique([3, 1, 3, 2, 1]), [3, 1, 2]); assert.deepEqual(unique([]), []); });\n`),
    "unique.ts",
    `export const unique = <T>(a: T[]): T[] => [...new Set(a)];\n`,
  ),
  withRef(
    implementTask("capitalize", "Uppercase the first letter of each space-separated word and lowercase the rest.", `test("capitalize", () => { assert.equal(capitalize("hello wORLD"), "Hello World"); assert.equal(capitalize(""), ""); });\n`),
    "capitalize.ts",
    `export const capitalize = (s: string) => s.split(" ").map((w) => (w ? w[0]!.toUpperCase() + w.slice(1).toLowerCase() : w)).join(" ");\n`,
  ),
  withRef(
    implementTask("isPalindrome", "True if the string reads the same forwards and backwards, ignoring case and anything that is not a letter or digit.", `test("isPalindrome", () => { assert.equal(isPalindrome("A man, a plan, a canal: Panama"), true); assert.equal(isPalindrome("hello"), false); assert.equal(isPalindrome(""), true); });\n`),
    "isPalindrome.ts",
    `export function isPalindrome(s: string) { const t = s.toLowerCase().replace(/[^a-z0-9]/g, ""); return t === [...t].reverse().join(""); }\n`,
  ),
  withRef(
    implementTask("parseQuery", "Parse a query string like 'a=1&b=two' (with or without a leading '?') into a plain object of strings. Decode %20-style escapes. Ignore empty pairs.", `test("parseQuery", () => { assert.deepEqual(parseQuery("?a=1&b=two"), { a: "1", b: "two" }); assert.deepEqual(parseQuery("name=Ada%20L&&x="), { name: "Ada L", x: "" }); assert.deepEqual(parseQuery(""), {}); });\n`),
    "parseQuery.ts",
    `export function parseQuery(q: string): Record<string, string> { const o: Record<string, string> = {}; for (const p of q.replace(/^\\?/, "").split("&")) { if (!p) continue; const [k, v = ""] = p.split("="); o[decodeURIComponent(k!)] = decodeURIComponent(v); } return o; }\n`,
  ),
  withRef(
    implementTask("range", "range(start, end) returns the integers from start up to but not including end. range(3) is shorthand for range(0, 3). An empty range gives [].", `test("range", () => { assert.deepEqual(range(0, 3), [0, 1, 2]); assert.deepEqual(range(3), [0, 1, 2]); assert.deepEqual(range(2, 2), []); assert.deepEqual(range(5, 2), []); });\n`),
    "range.ts",
    `export function range(a: number, b?: number): number[] { const [s, e] = b === undefined ? [0, a] : [a, b]; const o: number[] = []; for (let i = s; i < e; i++) o.push(i); return o; }\n`,
  ),
];

// A bug to fix, not code to write.
const fixBug: Task & { reference: Record<string, string> } = {
  id: "fix-sumTo",
  prompt: "sumTo.ts has a bug: sumTo(3) should return 6 but does not. Fix the bug. Do not change sumTo.test.ts.",
  setup: (dir) => {
    fs.writeFileSync(path.join(dir, "sumTo.ts"), `export function sumTo(n: number): number {\n  let total = 0;\n  for (let i = 1; i < n; i++) total += i;\n  return total;\n}\n`);
    fs.writeFileSync(path.join(dir, "sumTo.test.ts"), header("sumTo") + `test("sumTo", () => { assert.equal(sumTo(3), 6); assert.equal(sumTo(1), 1); assert.equal(sumTo(0), 0); });\n`);
  },
  grade: async (dir) => {
    const r = await runGate("node", ["--test", "sumTo.test.ts"], dir);
    const testUntouched = fs.readFileSync(path.join(dir, "sumTo.test.ts"), "utf8").includes("assert.equal(sumTo(3), 6)"); // the agent must not edit the test to cheat
    return { pass: r.ok && testUntouched, detail: !testUntouched ? "the test file was changed" : r.ok ? "tests pass" : r.output.slice(-200) };
  },
  reference: { "sumTo.ts": `export function sumTo(n: number): number {\n  let total = 0;\n  for (let i = 1; i <= n; i++) total += i;\n  return total;\n}\n` },
};

// A cleanup with TWO conditions: behavior preserved AND the unwanted thing gone.
const removeLogs: Task & { reference: Record<string, string> } = {
  id: "remove-console-log",
  prompt: "Remove every console.log call from app.ts without changing what greet() returns.",
  setup: (dir) => {
    fs.writeFileSync(path.join(dir, "app.ts"), `export function greet(name: string): string {\n  console.log("greet called with", name);\n  const msg = "Hello, " + name + "!";\n  console.log("returning", msg);\n  return msg;\n}\n`);
    fs.writeFileSync(path.join(dir, "app.test.ts"), header("greet").replace('"./greet.ts"', '"./app.ts"') + `test("greet", () => assert.equal(greet("Ada"), "Hello, Ada!"));\n`);
  },
  grade: async (dir) => {
    const r = await runGate("node", ["--test", "app.test.ts"], dir);
    const clean = !fs.readFileSync(path.join(dir, "app.ts"), "utf8").includes("console.log");
    return { pass: r.ok && clean, detail: !clean ? "console.log is still there" : r.ok ? "ok" : r.output.slice(-200) };
  },
  reference: { "app.ts": `export function greet(name: string): string {\n  const msg = "Hello, " + name + "!";\n  return msg;\n}\n` },
};

export const GOLDEN: (Task & { reference: Record<string, string> })[] = [...implement, fixBug, removeLogs];
