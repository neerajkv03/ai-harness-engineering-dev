// Benchmark your harness against Pi on the Level 6 golden tasks, with the same model, the same tools and the same trials.
// Run: bun run examples/level-7/capstone/bench.ts [--trials 3] [--limit 11] [--pi]
//   Without --pi only the capstone harness runs. With --pi it also runs Pi (install it first: npm i -g @earendil-works/pi-coding-agent;
//   set PI_CMD if the command is not `pi`). Both use claude-opus-5-5 and ANTHROPIC_API_KEY.
// Cost: tasks x trials x variants agent runs. Start with --limit 3 --trials 2.
// Every trial's transcript is kept (capstone: a trace JSONL; Pi: its --mode json event stream), and the folder is printed.
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { runEval, runTrialInTempDir, summarize, type Task } from "../../level-6/lib/eval.ts";
import { GOLDEN } from "../../level-6/lib/golden-tasks.ts";
import { costUsd } from "../../level-6/lib/pricing.ts";
import { stratifiedPermutationTest } from "../../level-6/lib/stats.ts";
import { createHarness } from "./src/harness.ts";
import { traceHooks } from "./src/trace.ts";
import type { Caller } from "./src/types.ts";

const MODEL = "claude-opus-5-5";
const arg = (name: string, fallback: number) => Number(process.argv[process.argv.indexOf(`--${name}`) + 1]) || fallback;
const trials = arg("trials", 3);
const tasks = GOLDEN.slice(0, arg("limit", GOLDEN.length));
const transcripts = fs.mkdtempSync(path.join(os.tmpdir(), "bench-transcripts-")); // outside the task folders, which are deleted
let trialNo = 0;
const transcriptFile = (harness: string, task: Task, ext: string) => path.join(transcripts, `${harness}-${task.id}-${++trialNo}.${ext}`);

// Both harnesses get the SAME instruction, and both have bash, so both can run the tests. (The golden prompts
// were written for an agent that cannot run code; that sentence is removed so the comparison is fair.)
const promptFor = (t: Task) => t.prompt.replace(" You cannot run the tests, so read them carefully first.", " Run the tests to check your work.");

const client = new Anthropic();
const call: Caller = (req) =>
  client.messages.create({ model: MODEL, max_tokens: 16000, system: req.system, messages: req.messages, ...(req.tools.length > 0 && { tools: req.tools }) });

type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number };
const total = (u: Usage) => u.input + u.output + u.cacheRead + u.cacheWrite;

async function capstoneTrial(task: Task, dir: string) {
  const usage: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  const trace = traceHooks(transcriptFile("capstone", task, "jsonl"));
  const h = createHarness({
    root: dir,
    call,
    maxTurns: 15,
    skillsDir: path.join(import.meta.dirname, "skills"),
    hooks: {
      ...trace,
      afterModel: (e) => {
        trace.afterModel?.(e);
        for (const k of ["input", "output", "cacheRead", "cacheWrite"] as const) usage[k] += e.usage[k];
      },
    },
  });
  const r = await h.run(promptFor(task));
  return { turns: r.turns, tokens: total(usage), costUsd: costUsd(MODEL, { input: usage.input, output: usage.output, cacheRead: usage.cacheRead, cacheWrite5m: usage.cacheWrite }) };
}

/** Pi in JSON mode: its event stream is the transcript, and its assistant messages carry usage and cost. */
function piTrial(task: Task, dir: string): Promise<{ turns: number; tokens: number; costUsd: number }> {
  // Pass the prompt as an @file so no shell quoting can mangle it. The file lives OUTSIDE the task folder.
  const promptFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pi-prompt-")), "task.txt");
  fs.writeFileSync(promptFile, promptFor(task));
  const win = process.platform === "win32";
  const q = (s: string) => (win ? `"${s}"` : s); // on Windows `pi` is a .cmd file, which needs a shell
  const args = ["--mode", "json", "--model", `anthropic/${MODEL}`, "--no-session", "--no-approve", "--no-context-files", "--no-extensions", "--no-skills", "--no-mcp", "--tools", "read,write,edit,bash", `@${promptFile}`, "Follow the instructions in the attached file."].map(q);
  const out = transcriptFile("pi", task, "jsonl");
  return new Promise((resolve, reject) =>
    execFile(process.env.PI_CMD ?? "pi", args, { cwd: dir, shell: win, timeout: 300_000, maxBuffer: 64 * 1024 * 1024 }, (err, stdout) => {
      fs.writeFileSync(out, stdout);
      if (err) return reject(err);
      let turns = 0;
      let tokens = 0;
      let cost = 0;
      for (const line of stdout.split("\n")) {
        if (!line.trim()) continue;
        const e = JSON.parse(line) as { type: string; message?: { role?: string; usage?: { totalTokens?: number; cost?: { total?: number } } } };
        if (e.type === "turn_end") turns++;
        if (e.type === "message_end" && e.message?.role === "assistant") {
          tokens += e.message.usage?.totalTokens ?? 0;
          cost += e.message.usage?.cost?.total ?? 0;
        }
      }
      resolve({ turns, tokens, costUsd: cost });
    }),
  );
}

async function evaluate(name: string, trialFn: (task: Task, dir: string) => Promise<{ turns: number; tokens: number; costUsd: number }>) {
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
console.log("\nharness    pass rate        95% interval   tokens/trial  $/trial   turns/trial  s/trial  errors");
for (const [name, { summary: s }] of Object.entries(results)) {
  console.log(
    `${name.padEnd(10)} ${`${s.passes}/${s.n} ${pct(s.passRate)}`.padEnd(16)} ${`${pct(s.ci.low)}-${pct(s.ci.high)}`.padEnd(14)} ` +
      `${String(Math.round(s.meanTokens)).padEnd(13)} ${s.meanCostUsd.toFixed(3).padEnd(9)} ${s.meanTurns.toFixed(1).padEnd(12)} ${(s.meanMs / 1000).toFixed(1).padEnd(8)} ${s.errors}`,
  );
}

if (results.pi) {
  const graded = (name: string, id: string) => results[name]!.records.filter((r) => r.taskId === id && !r.error).map((r) => r.pass);
  const groups = tasks.map((t) => ({ a: graded("capstone", t.id), b: graded("pi", t.id) })).filter((g) => g.a.length > 0 && g.b.length > 0);
  const { diff, p } = stratifiedPermutationTest(groups);
  console.log(`\nPi minus capstone (mean per task): ${(diff * 100).toFixed(1)} points, p = ${p.toFixed(3)}`);
  console.log(p < 0.05 ? "A real difference. Read the transcripts of the tasks one of you failed (lesson 6.3) to find out why." : "No measurable difference on these tasks. That is a fine result for a few hundred lines: now add harder tasks.");
}
console.log(`\nTranscripts: ${transcripts}`);
console.log("Read the failing transcripts before trusting any number. Per-task failures (capstone):");
for (const t of results.capstone!.summary.perTask.filter((t) => t.passes < t.trials)) console.log(`  ${t.taskId}: ${t.passes}/${t.trials}`);
