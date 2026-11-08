// Benchmark your harness against Pi on the Level 6 golden tasks, with the same model, the same tools and the same trials.
// Run: bun run examples/level-7/capstone/bench.ts [--trials 3] [--limit 10] [--pi]
//   Without --pi only the capstone harness runs. With --pi it also runs Pi (install it first: npm i -g @earendil-works/pi-coding-agent;
//   set PI_CMD if the command is not `pi`). Pi uses ANTHROPIC_API_KEY and its default Anthropic model, so check the model matches.
// Cost: tasks x trials x variants agent runs. Start with --limit 3 --trials 2.
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { runEval, runTrialInTempDir, summarize, type Task } from "../../level-6/lib/eval.ts";
import { GOLDEN } from "../../level-6/lib/golden-tasks.ts";
import { permutationTest } from "../../level-6/lib/stats.ts";
import { createHarness } from "./src/harness.ts";
import type { Caller } from "./src/types.ts";

const arg = (name: string, fallback: number) => Number(process.argv[process.argv.indexOf(`--${name}`) + 1]) || fallback;
const trials = arg("trials", 3);
const tasks = GOLDEN.slice(0, arg("limit", GOLDEN.length));

// Both harnesses get the SAME instruction, and both have bash, so both can run the tests. (The golden prompts
// were written for an agent that cannot run code; that sentence is removed so the comparison is fair.)
const promptFor = (t: Task) => t.prompt.replace(" You cannot run the tests, so read them carefully first.", " Run the tests to check your work.");

const client = new Anthropic();
const call: Caller = (req) =>
  client.messages.create({ model: "claude-opus-5-5", max_tokens: 4096, system: req.system, messages: req.messages, ...(req.tools.length > 0 && { tools: req.tools }) });

async function capstoneTrial(task: Task, dir: string) {
  const h = createHarness({ root: dir, call, maxTurns: 15 });
  const r = await h.run(promptFor(task));
  return { turns: r.turns, tokens: 0 }; // token totals are in the trace; keep this script simple
}

function piTrial(task: Task, dir: string): Promise<{ turns: number; tokens: number }> {
  // Pass the prompt as an @file so no shell quoting can mangle it. The file lives OUTSIDE the task folder.
  const promptFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pi-prompt-")), "task.txt");
  fs.writeFileSync(promptFile, promptFor(task));
  const win = process.platform === "win32";
  const q = (s: string) => (win ? `"${s}"` : s); // on Windows `pi` is a .cmd file, which needs a shell
  const args = ["--print", "--no-session", "--no-approve", "--no-context-files", "--no-extensions", "--no-skills", "--no-mcp", "--tools", "read,write,edit,bash", `@${promptFile}`, "Follow the instructions in the attached file."].map(q);
  return new Promise((resolve, reject) =>
    execFile(process.env.PI_CMD ?? "pi", args, { cwd: dir, shell: win, timeout: 300_000 }, (err) => (err ? reject(err) : resolve({ turns: 0, tokens: 0 }))),
  );
}

async function evaluate(name: string, trialFn: (task: Task, dir: string) => Promise<{ turns: number; tokens: number }>) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  console.log(`running ${name}...`);
  const records = await runEval({
    variant: name,
    taskIds: tasks.map((t) => t.id),
    trials,
    concurrency: 3,
    runTrial: (id) => runTrialInTempDir(byId.get(id)!, trialFn),
  });
  return { records, summary: summarize(records) };
}

const results: Record<string, Awaited<ReturnType<typeof evaluate>>> = { capstone: await evaluate("capstone", capstoneTrial) };
if (process.argv.includes("--pi")) results.pi = await evaluate("pi", piTrial);

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
console.log("\nharness    pass rate        95% interval   mean time/trial");
for (const [name, { summary: s }] of Object.entries(results)) {
  console.log(`${name.padEnd(10)} ${`${s.passes}/${s.n} ${pct(s.passRate)}`.padEnd(16)} ${`${pct(s.ci.low)}-${pct(s.ci.high)}`.padEnd(14)} ${(s.meanMs / 1000).toFixed(1)} s`);
}

if (results.pi) {
  const { diff, p } = permutationTest(results.capstone!.records.map((r) => r.pass), results.pi.records.map((r) => r.pass));
  console.log(`\nPi minus capstone: ${(diff * 100).toFixed(1)} points, p = ${p.toFixed(3)}`);
  console.log(p < 0.05 ? "A real difference. Read the transcripts of the tasks one of you failed (lesson 6.3) to find out why." : "No measurable difference on these tasks. That is a fine result for 467 lines: now add harder tasks.");
}
console.log("\nRead the failing transcripts before trusting any number. Per-task failures (capstone):");
for (const t of results.capstone!.summary.perTask.filter((t) => t.passes < t.trials)) console.log(`  ${t.taskId}: ${t.passes}/${t.trials}`);
