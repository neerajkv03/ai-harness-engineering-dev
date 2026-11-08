import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { seedWorkspace } from "./demo-workspace.ts";
import { runGate } from "./patterns.ts";
import { loadFeatures, nextFeature, reentryPrompt, runFeatures, type Feature } from "./progress.ts";

// Reference solutions, used ONLY here to play the part of a working agent.
const SOLUTIONS: Record<string, string> = {
  slugify: `export const slugify = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");\n`,
  clamp: `export function clamp(n: number, min: number, max: number): number {\n  if (min > max) throw new RangeError("min > max");\n  return Math.min(Math.max(n, min), max);\n}\n`,
  chunk: `export function chunk<T>(items: T[], size: number): T[][] {\n  if (size < 1) throw new RangeError("size < 1");\n  const out: T[][] = [];\n  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));\n  return out;\n}\n`,
};

const gateFor = (dir: string) => (f: Feature) => {
  const [cmd, ...args] = f.test.split(" "); // "node --test x.test.ts": use the real node, even when this suite runs under bun
  return runGate(cmd!, args, dir);
};
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "l5-progress-"));

test("the demo tests really fail without an implementation, and pass with the reference one", async () => {
  const dir = tmp();
  seedWorkspace(dir);
  const [slugify] = loadFeatures(dir);
  assert.equal((await gateFor(dir)(slugify!)).ok, false);
  fs.writeFileSync(path.join(dir, "slugify.ts"), SOLUTIONS.slugify!);
  assert.equal((await gateFor(dir)(slugify!)).ok, true);
});

test("a killed session resumes at the first unfinished feature and never redoes finished work", async () => {
  const dir = tmp();
  seedWorkspace(dir);
  const write = (id: string) => fs.writeFileSync(path.join(dir, `${id}.ts`), SOLUTIONS[id]!);

  // Session A: finishes slugify, then the process "dies" while working on clamp.
  await assert.rejects(
    runFeatures({
      dir,
      gate: gateFor(dir),
      implement: async (f) => {
        if (f.id === "slugify") { write("slugify"); return "wrote slugify"; }
        throw new Error("process killed");
      },
    }),
    /process killed/,
  );
  assert.deepEqual(loadFeatures(dir).map((f) => f.passes), [true, false, false]);
  assert.match(fs.readFileSync(path.join(dir, "PROGRESS.md"), "utf8"), /DONE slugify/);

  // Session B: a brand-new run with no memory. It must start at clamp.
  const attempted: string[] = [];
  const result = await runFeatures({
    dir,
    gate: gateFor(dir),
    implement: async (f, prompt) => {
      attempted.push(f.id);
      assert.match(prompt, /DONE slugify/, "the re-entry prompt carries the progress log");
      write(f.id);
      return `wrote ${f.id}`;
    },
  });
  assert.deepEqual(attempted, ["clamp", "chunk"]);
  assert.deepEqual(result, { completed: ["clamp", "chunk"] });
  assert.equal(nextFeature(loadFeatures(dir)), undefined);
});

test("a feature that keeps failing stops the run for a human instead of looping", async () => {
  const dir = tmp();
  seedWorkspace(dir);
  let attempts = 0;
  const result = await runFeatures({
    dir,
    gate: gateFor(dir),
    maxAttemptsPerFeature: 2,
    implement: async () => { attempts++; fs.writeFileSync(path.join(dir, "slugify.ts"), "export const slugify = () => 'wrong';\n"); return "tried"; },
  });
  assert.equal(attempts, 2);
  assert.deepEqual(result, { completed: [], stoppedOn: "slugify" });
  assert.match(fs.readFileSync(path.join(dir, "PROGRESS.md"), "utf8"), /FAILED slugify \(attempt 2\)/);
});

test("the re-entry prompt is self-contained", () => {
  const dir = tmp();
  seedWorkspace(dir);
  const f = nextFeature(loadFeatures(dir))!;
  const prompt = reentryPrompt(dir, f);
  assert.match(prompt, /no memory/i);
  assert.match(prompt, /feature "slugify"/);
  assert.match(prompt, /node --test slugify\.test\.ts/);
  assert.match(prompt, /Do not edit test files/);
});
