// A small eval runner: tasks with graders, several trials per task, a fresh folder for every trial.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { wilson } from "./stats.ts";

/** A golden task: a prompt, a way to set up the world, and a grader that checks the OUTCOME (not what the agent said). */
export type Task = {
  id: string;
  prompt: string;
  setup: (dir: string) => void | Promise<void>;
  grade: (dir: string) => Promise<{ pass: boolean; detail?: string }>;
};

/** `error` marks a run that crashed (rate limit, network, missing key, harness bug): it was never graded. */
export type TrialResult = { pass: boolean; turns: number; tokens: number; ms: number; detail?: string; error?: boolean; costUsd?: number };
export type TrialRecord = TrialResult & { variant: string; taskId: string; trial: number };

/**
 * Run one trial in a brand-new folder. Trials must not share state: an agent that can see the previous trial's
 * files (or git history) gets an unfair head start and inflates your score.
 */
export async function runTrialInTempDir(
  task: Task,
  agent: (task: Task, dir: string) => Promise<{ turns: number; tokens: number; costUsd?: number }>,
): Promise<TrialResult> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `eval-${task.id}-`));
  const started = performance.now();
  try {
    await task.setup(dir);
    const { turns, tokens, costUsd } = await agent(task, dir);
    const graded = await task.grade(dir);
    return { pass: graded.pass, detail: graded.detail, turns, tokens, costUsd, ms: Math.round(performance.now() - started) };
  } catch (err) {
    // A crash is not the agent failing the task, and not a reason to lose the other results. Record it apart:
    // counting a 429 as a failure would lower the pass rate and drag tokens/turns toward zero.
    return { pass: false, error: true, detail: `error: ${String(err)}`, turns: 0, tokens: 0, ms: Math.round(performance.now() - started) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export async function runEval(opts: {
  variant: string;
  taskIds: string[];
  trials: number;
  runTrial: (taskId: string, trial: number) => Promise<TrialResult>;
  concurrency?: number;
}): Promise<TrialRecord[]> {
  const jobs = opts.taskIds.flatMap((taskId) => Array.from({ length: opts.trials }, (_, trial) => ({ taskId, trial })));
  const records: TrialRecord[] = new Array(jobs.length);
  let next = 0;
  const worker = async () => {
    for (let i = next++; i < jobs.length; i = next++) {
      const { taskId, trial } = jobs[i]!;
      records[i] = { variant: opts.variant, taskId, trial, ...(await opts.runTrial(taskId, trial)) };
    }
  };
  await Promise.all(Array.from({ length: Math.min(opts.concurrency ?? 3, jobs.length) }, worker));
  return records;
}

export function summarize(all: TrialRecord[]) {
  const records = all.filter((r) => !r.error); // only graded trials; errors are reported separately
  const n = records.length;
  const passes = records.filter((r) => r.pass).length;
  const mean = (f: (r: TrialRecord) => number) => (n ? records.reduce((s, r) => s + f(r), 0) / n : 0);
  const taskIds = [...new Set(records.map((r) => r.taskId))];
  return {
    n,
    errors: all.length - n,
    passes,
    passRate: n ? passes / n : 0,
    ci: wilson(passes, n),
    meanTokens: mean((r) => r.tokens),
    meanCostUsd: mean((r) => r.costUsd ?? 0),
    meanTurns: mean((r) => r.turns),
    meanMs: mean((r) => r.ms),
    perTask: taskIds.map((taskId) => {
      const rs = records.filter((r) => r.taskId === taskId);
      return { taskId, trials: rs.length, passes: rs.filter((r) => r.pass).length };
    }),
  };
}
