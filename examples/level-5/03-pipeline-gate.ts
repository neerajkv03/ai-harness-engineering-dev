// Lesson 5.2: planner -> implementer -> deterministic gate -> reviewer. The reviewer only sees work that already passed the tests.
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

// Stage 1: a planner with read-only tools. It writes the plan once; the implementer follows it on every attempt.
const plan = await runAgent({
  system: "You plan small code changes. You cannot write files. Read the tests, then reply with a numbered plan of at most 5 steps, naming every edge case the tests check.",
  task: "Plan how to implement slugify in slugify.ts so that slugify.test.ts passes.",
  tools: fileTools(dir),
  call,
  maxTurns: 4,
});
console.log(`plan:\n${plan.text}\n`);

const result = await runPipeline({
  // Stage 2: an agent that can write ONE file implements the plan.
  implement: async (feedback) => {
    const r = await runAgent({
      system: "You write TypeScript. You cannot run code. Read the test file, then write the implementation file the tests import.",
      task: `Implement slugify in slugify.ts so that slugify.test.ts passes. Follow this plan:\n${plan.text}` + (feedback ? `\n\n${feedback}` : ""),
      tools: fileTools(dir, { write: true, writable: ["slugify.ts"] }), // it cannot "fix" the gate by editing the test
      call,
      maxTurns: 8,
    });
    return r.text;
  },

  // Stage 3: NOT a model. A real test run that passes or fails.
  gate: () => runGate("node", ["--test", "slugify.test.ts"], dir),

  // Stage 4: a reviewer with read-only tools, reached only after the gate passes.
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
