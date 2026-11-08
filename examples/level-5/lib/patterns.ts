// Two multi-agent patterns as plain functions: fan-out/fan-in and a pipeline with a deterministic gate.
import { execFile } from "node:child_process";
import { runAgent, type Caller, type Tool } from "./agent.ts";

// ───────────── Fan-out / fan-in ─────────────

export async function fanOutFanIn(opts: {
  tasks: string[];
  workerSystem: string;
  workerTools: Tool[];
  synthesizeSystem: string;
  call: Caller;
}): Promise<{ reports: string[]; final: string }> {
  // Run the workers at the same time. allSettled: one failed worker must not throw away the others' work.
  const settled = await Promise.allSettled(
    opts.tasks.map((task) => runAgent({ system: opts.workerSystem, task, tools: opts.workerTools, call: opts.call, maxTurns: 8 })),
  );
  const reports = settled.map((s, i) => {
    if (s.status === "rejected") return `Worker ${i + 1} FAILED: ${String(s.reason)}`;
    return s.value.finished ? s.value.text : `Worker ${i + 1} ran out of turns without a report.`;
  });

  // Fan-in: one final call that sees only the reports, never the workers' raw reading.
  const combined = reports.map((r, i) => `## Report ${i + 1}\n${r}`).join("\n\n");
  const synthesis = await runAgent({
    system: opts.synthesizeSystem,
    task: `Combine these worker reports into one answer. Note any worker that failed.\n\n${combined}`,
    call: opts.call,
    maxTurns: 2,
  });
  return { reports, final: synthesis.text };
}

// ───────────── Pipeline with a gate ─────────────

export type GateResult = { ok: boolean; output: string };

/** Run a command as a deterministic check. No model involved: it passes or it does not. */
export function runGate(cmd: string, args: string[], cwd: string, timeoutMs = 30_000): Promise<GateResult> {
  // A gate must not inherit the caller's test-runner state. Under `node --test`, a nested `node --test`
  // sees NODE_TEST_CONTEXT, behaves as a child worker, and can report success without really running.
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;

  return new Promise((resolve) => {
    execFile(cmd, args, { cwd, timeout: timeoutMs, env }, (error, stdout, stderr) => {
      resolve({ ok: !error, output: `${stdout}\n${stderr}`.trim().slice(-3000) }); // keep the END: failures print last
    });
  });
}

export async function runPipeline(opts: {
  implement: (feedback?: string) => Promise<string>;
  gate: () => Promise<GateResult>;
  review: (implementation: string) => Promise<string>;
  maxFixes?: number;
}): Promise<{ status: "reviewed" | "gate_failed"; attempts: number; review?: string; lastGate?: GateResult }> {
  const maxAttempts = (opts.maxFixes ?? 2) + 1;
  let feedback: string | undefined;
  let lastGate: GateResult | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const implementation = await opts.implement(feedback);
    lastGate = await opts.gate();
    if (lastGate.ok) {
      // The reviewer only ever sees work that already passed the objective check.
      return { status: "reviewed", attempts: attempt, review: await opts.review(implementation), lastGate };
    }
    feedback = `The checks failed. Fix the code. Output:\n${lastGate.output}`;
  }
  return { status: "gate_failed", attempts: maxAttempts, lastGate };
}
