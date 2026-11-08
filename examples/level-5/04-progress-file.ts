// Lesson 5.3: a long task that survives restarts. State lives in files, not in the model's context.
// Run: bun run examples/level-5/04-progress-file.ts            (Ctrl+C any time, then run it again: it resumes)
//      bun run examples/level-5/04-progress-file.ts --reset    (start over)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { anthropicCaller, runAgent } from "./lib/agent.ts";
import { seedWorkspace } from "./lib/demo-workspace.ts";
import { LoopGuard } from "./lib/loop-guard.ts";
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
    const r = await runAgent({
      system: "You write TypeScript. You cannot run code, so read the test file carefully. You may only write the implementation file.",
      task: prompt,
      tools: fileTools(dir, { write: true }),
      call,
      maxTurns: 10,
      beforeTool: (name, input) => guard.record(name, input),
    });
    console.log(`  agent (${feature.id}): ${r.text.slice(0, 100)}`);
    return r.text;
  },
  // The harness, not the agent, decides whether a feature is done: the real tests either pass or they do not.
  gate: (feature) => {
    const [cmd, ...args] = feature.test.split(" ");
    return runGate(cmd!, args, dir);
  },
});

console.log(result.stoppedOn ? `\nStopped on "${result.stoppedOn}". A human should look at PROGRESS.md.` : "\nAll features pass.");
console.log(`\n${fs.readFileSync(path.join(dir, "PROGRESS.md"), "utf8")}`);
