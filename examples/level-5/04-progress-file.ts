// Lesson 5.3: a long task that survives restarts. State lives in files, not in the model's context.
// Run: bun run examples/level-5/04-progress-file.ts            (Ctrl+C any time, then run it again: it resumes)
//      bun run examples/level-5/04-progress-file.ts --reset    (start over)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { anthropicCaller, runAgent } from "./lib/agent.ts";
import { seedWorkspace } from "./lib/demo-workspace.ts";
import { BudgetExceeded, LoopDetected, LoopGuard } from "./lib/loop-guard.ts";
import { runGate } from "./lib/patterns.ts";
import { loadFeatures, runFeatures } from "./lib/progress.ts";
import { fileTools } from "./lib/tools.ts";

const call = anthropicCaller();
const dir = path.join(os.tmpdir(), "l5-long-running"); // a fixed folder, so a restart finds the same state
if (process.argv.includes("--reset")) fs.rmSync(dir, { recursive: true, force: true });
if (!fs.existsSync(path.join(dir, "feature_list.json"))) seedWorkspace(dir);

console.log(`workspace: ${dir}`);
console.log(`already passing: ${loadFeatures(dir).filter((f) => f.passes).map((f) => f.id).join(", ") || "(none)"}\n`);

const result = await runFeatures({
  dir,
  // Every session is a brand-new agent. The re-entry prompt (built from the progress log) is all it knows.
  implement: async (feature, prompt) => {
    const guard = new LoopGuard({ maxCalls: 25 }); // a stuck agent stops itself instead of burning tokens
    try {
      const r = await runAgent({
        system: "You write TypeScript. You cannot run code, so read the test file carefully. You may only write the implementation file.",
        task: prompt,
        // Enforced, not asked: the agent can write its implementation file and nothing else. It cannot edit the
        // tests or feature_list.json, so it has no way to mark its own work as passing.
        tools: fileTools(dir, { write: true, writable: [`${feature.id}.ts`] }),
        call,
        maxTurns: 10,
        beforeTool: (name, input) => guard.record(name, input),
      });
      console.log(`  agent (${feature.id}): ${r.text.slice(0, 100)}`);
      return r.text;
    } catch (err) {
      // LoopDetected or BudgetExceeded: end this session, let the gate fail and the log record it, then move on.
      if (err instanceof LoopDetected || err instanceof BudgetExceeded) return `stopped by loop guard: ${err.message}`;
      throw err;
    }
  },
  // The harness, not the agent, decides whether a feature is done: the real tests either pass or they do not.
  gate: (feature) => {
    const [cmd, ...args] = feature.test.split(" ");
    return runGate(cmd!, args, dir);
  },
});

console.log(result.stoppedOn ? `\nStopped on "${result.stoppedOn}". A human should look at PROGRESS.md.` : "\nAll features pass.");
console.log(`\n${fs.readFileSync(path.join(dir, "PROGRESS.md"), "utf8")}`);
