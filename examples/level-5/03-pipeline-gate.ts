// Lesson 5.2: implementer -> deterministic gate -> reviewer. The reviewer only sees work that already passed the tests.
// Run: bun run examples/level-5/03-pipeline-gate.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { anthropicCaller, runAgent } from "./lib/agent.ts";
import { seedWorkspace } from "./lib/demo-workspace.ts";
import { runGate, runPipeline } from "./lib/patterns.ts";
import { fileTools } from "./lib/tools.ts";

const call = anthropicCaller();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "l5-pipeline-"));
seedWorkspace(dir); // writes slugify.test.ts, clamp.test.ts, chunk.test.ts. The tests are the spec.
console.log(`workspace: ${dir}\n`);

const result = await runPipeline({
  // Stage 1: an agent that can read and write files (and nothing else) implements slugify.
  implement: async (feedback) => {
    const r = await runAgent({
      system: "You write TypeScript. You cannot run code. Read the test file, then write the implementation file the tests import.",
      task:
        "Implement slugify in slugify.ts so that slugify.test.ts passes: lowercase, each run of non-alphanumeric characters becomes one '-', no leading or trailing '-'." +
        (feedback ? `\n\n${feedback}` : ""),
      tools: fileTools(dir, { write: true }),
      call,
      maxTurns: 8,
    });
    return r.text;
  },

  // Stage 2: NOT a model. A real test run that passes or fails.
  gate: () => runGate("node", ["--test", "slugify.test.ts"], dir),

  // Stage 3: a reviewer with read-only tools, reached only after the gate passes.
  review: async () => {
    const r = await runAgent({
      system: "You are a strict code reviewer. Read slugify.ts and slugify.test.ts. List real problems only, or say 'No issues'.",
      task: "Review slugify.ts for correctness, edge cases the tests miss, and clarity. Maximum 5 bullet points.",
      tools: fileTools(dir),
      call,
      maxTurns: 6,
    });
    return r.text;
  },
  maxFixes: 2,
});

console.log(`status: ${result.status} after ${result.attempts} attempt(s)`);
if (result.status === "reviewed") console.log(`\nreview:\n${result.review}`);
else console.log(`\nlast gate output:\n${result.lastGate?.output}`);
