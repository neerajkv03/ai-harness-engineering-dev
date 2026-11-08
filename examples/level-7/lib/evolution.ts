// A self-improvement loop with guardrails. A proposer suggests ONE change to the harness; the loop decides what to do with it.
// The loop never edits the live harness itself: it tests the change on a COPY, and a human merges it.
//   1 measure the current harness   2 analyze the failed traces   3 ask the proposer for ONE change
//   4 guardrails: reject anything unsafe BEFORE running   5 apply it to a copy and measure again
//   6 accept only a real win with no regressions, only if the proposer's own prediction came true, and only if the win
//     holds again on held-out seeds   7 stop and ask a human
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Caller } from "../../level-5/lib/agent.ts";
import { analyze, type Finding } from "../../level-6/lib/analyze.ts";
import { permutationTest } from "../../level-6/lib/stats.ts";
import type { TraceEvent } from "../../level-6/lib/trace.ts";
import { EDITABLE_FILES, PROTECTED_FILES, TASKS, readConfig, runTrial, type ScenarioTask } from "./evolution-scenario.ts";

// ── The proposal, and the guardrails that check it ───────────────────

/** Each editable file has a schema. A change that does not fit is rejected, not "fixed up". */
const FILE_SCHEMAS: Record<string, z.ZodTypeAny> = {
  "read-tool.json": z.object({ cap: z.number().int().min(50).max(200_000), truncationPointer: z.boolean() }).strict(),
  "verify.json": z.object({ announceChecks: z.boolean() }).strict(),
};

const ProposalSchema = z.object({
  file: z.string(),
  content: z.string(),
  rationale: z.string().min(10),
  // A falsifiable contract: the proposer must say what will improve and by how much. We check it afterwards.
  prediction: z.object({ taskId: z.string(), minImprovement: z.number().gt(0).lte(1) }),
});
export type Proposal = z.infer<typeof ProposalSchema>;

export type Guardrail = { ok: true; proposal: Proposal } | { ok: false; reason: string };

export function checkProposal(raw: unknown): Guardrail {
  const parsed = ProposalSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: `malformed proposal: ${parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}` };
  const p = parsed.data;

  // Protected files first, and by NAME: a plausible-sounding reason is never enough to touch the safety layer.
  if (path.basename(p.file) !== p.file || (PROTECTED_FILES as readonly string[]).includes(p.file)) return { ok: false, reason: `"${p.file}" is protected or not a plain file name` };
  if (!(EDITABLE_FILES as readonly string[]).includes(p.file)) return { ok: false, reason: `"${p.file}" is not on the list of editable harness files` };

  let content: unknown;
  try { content = JSON.parse(p.content); } catch { return { ok: false, reason: `new content for ${p.file} is not valid JSON` }; }
  const shape = FILE_SCHEMAS[p.file]!.safeParse(content);
  if (!shape.success) return { ok: false, reason: `new content for ${p.file} does not match its schema: ${shape.error.issues.map((i) => i.message).join("; ")}` };
  if (!TASKS.some((t) => t.id === p.prediction.taskId)) return { ok: false, reason: `prediction names an unknown task "${p.prediction.taskId}"` };
  return { ok: true, proposal: p };
}

export type Proposer = (ctx: { findings: Finding[]; files: Record<string, string> }) => Promise<unknown>;

// ── Measuring a harness ──────────────────────────────────────────────

export type Measurement = { rates: Record<string, number>; outcomes: Record<string, boolean[]>; failedTrace?: TraceEvent[] };

export async function measure(harnessDir: string, trials: number, baseSeed = 1000): Promise<Measurement> {
  const outcomes: Record<string, boolean[]> = {};
  let failedTrace: TraceEvent[] | undefined;
  for (const task of TASKS) {
    outcomes[task.id] = [];
    for (let i = 0; i < trials; i++) {
      const r = await runTrial(harnessDir, task, baseSeed + i); // same seeds for baseline and candidate: a fair comparison
      outcomes[task.id]!.push(r.pass);
      if (!r.pass && task.kind === "target" && !failedTrace) failedTrace = r.events;
    }
  }
  const rates = Object.fromEntries(Object.entries(outcomes).map(([id, xs]) => [id, xs.filter(Boolean).length / xs.length]));
  return { rates, outcomes, failedTrace };
}

const HOLDOUT_SEED = 900_000; // far from the 1000+ seeds used for selection
const readHarnessFiles = (dir: string) => Object.fromEntries(fs.readdirSync(dir).map((f) => [f, fs.readFileSync(path.join(dir, f), "utf8")]));

// ── One round of evolution ───────────────────────────────────────────

export type Report = {
  status: "rejected" | "ready_for_review" | "merged";
  stage?: "guardrail" | "no_improvement" | "regression" | "prediction" | "holdout";
  reason?: string;
  proposal?: Proposal;
  baseline?: Record<string, number>;
  candidate?: Record<string, number>;
  pValue?: number;
  holdoutPValue?: number;
  predictionHeld?: boolean;
};

export async function evolveOnce(opts: {
  harnessDir: string; // the LIVE harness. Only a human-approved merge ever writes to it.
  proposer: Proposer;
  trials?: number;
  approve?: (report: Report) => Promise<boolean>; // the human. The default is "no".
}): Promise<Report> {
  const trials = opts.trials ?? 20;
  const baseline = await measure(opts.harnessDir, trials);
  const findings = baseline.failedTrace ? analyze(baseline.failedTrace, { readCap: readConfig(opts.harnessDir).cap }) : [];

  // 3 + 4: ask for ONE change, then run the guardrails before spending anything on it.
  let raw: unknown;
  try { raw = await opts.proposer({ findings, files: readHarnessFiles(opts.harnessDir) }); } catch (e) { return { status: "rejected", stage: "guardrail", reason: `proposer failed: ${String(e)}`, baseline: baseline.rates }; }
  const checked = checkProposal(raw);
  if (!checked.ok) return { status: "rejected", stage: "guardrail", reason: checked.reason, baseline: baseline.rates };
  const { proposal } = checked;

  // 5: apply to a copy. The live harness is untouched until a human says so.
  const candidateDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-candidate-"));
  for (const [name, content] of Object.entries(readHarnessFiles(opts.harnessDir))) fs.writeFileSync(path.join(candidateDir, name), content);
  fs.writeFileSync(path.join(candidateDir, proposal.file), proposal.content);
  const candidate = await measure(candidateDir, trials);

  const target: ScenarioTask = TASKS.find((t) => t.id === proposal.prediction.taskId)!;
  const common = { proposal, baseline: baseline.rates, candidate: candidate.rates };

  // 6a: a real win on the task it claimed to help, not noise.
  const t = permutationTest(baseline.outcomes[target.id]!, candidate.outcomes[target.id]!);
  if (!(t.diff > 0 && t.p < 0.05)) return { ...common, status: "rejected", stage: "no_improvement", reason: `${target.id}: ${pct(baseline.rates[target.id]!)} -> ${pct(candidate.rates[target.id]!)} (p = ${t.p.toFixed(3)}), not a significant improvement`, pValue: t.p };

  // 6b: no regressions. Every other task must hold its ground.
  for (const task of TASKS.filter((x) => x.id !== target.id)) {
    const r = permutationTest(baseline.outcomes[task.id]!, candidate.outcomes[task.id]!);
    if (r.diff < 0 && (r.p < 0.05 || candidate.rates[task.id]! < baseline.rates[task.id]! - 0.1)) {
      return { ...common, status: "rejected", stage: "regression", reason: `${task.id} got worse: ${pct(baseline.rates[task.id]!)} -> ${pct(candidate.rates[task.id]!)}`, pValue: t.p };
    }
  }

  // 6c: the proposer made a prediction. If it did not come true, we do not understand the change. Do not ship it.
  const gain = candidate.rates[target.id]! - baseline.rates[target.id]!;
  const predictionHeld = gain >= proposal.prediction.minImprovement;
  if (!predictionHeld) return { ...common, status: "rejected", stage: "prediction", reason: `predicted at least +${pct(proposal.prediction.minImprovement)} on ${target.id}, measured +${pct(gain)}`, pValue: t.p, predictionHeld };

  // 6d: confirm on held-out seeds. Steps 6a-6c used the same runs to judge the change, so a lucky draw could pass them.
  // Fresh seeds that no decision has looked at are the honest check. (Tasks stay the same: the scenario has only three.)
  const holdBase = await measure(opts.harnessDir, trials, HOLDOUT_SEED);
  const holdCand = await measure(candidateDir, trials, HOLDOUT_SEED);
  const h = permutationTest(holdBase.outcomes[target.id]!, holdCand.outcomes[target.id]!);
  if (!(h.diff > 0 && h.p < 0.05)) return { ...common, status: "rejected", stage: "holdout", reason: `${target.id}: the gain did not hold on held-out seeds (p = ${h.p.toFixed(3)})`, pValue: t.p, holdoutPValue: h.p, predictionHeld };

  // 7: it earned a human's attention. It does NOT merge itself.
  const report: Report = { ...common, status: "ready_for_review", pValue: t.p, holdoutPValue: h.p, predictionHeld };
  if (opts.approve && (await opts.approve(report))) {
    fs.writeFileSync(path.join(opts.harnessDir, proposal.file), proposal.content);
    return { ...report, status: "merged" };
  }
  return report;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

// ── A proposer backed by a real model ────────────────────────────────

export function llmProposer(call: Caller): Proposer {
  return async ({ findings, files }) => {
    const prompt = [
      "You maintain an agent harness. Its behavior is defined by the JSON files below. Propose exactly ONE change to ONE file that fixes the observed failures.",
      `Files you may change: ${EDITABLE_FILES.join(", ")}. Never touch: ${PROTECTED_FILES.join(", ")}.`,
      `Harness files:\n${Object.entries(files).map(([n, c]) => `--- ${n}\n${c}`).join("\n")}`,
      `Findings from a failed run:\n${findings.length ? findings.map((f) => `- [${f.kind}] ${f.evidence}. Look at: ${f.fix}`).join("\n") : "(none)"}`,
      `Tasks: ${TASKS.map((t) => t.id).join(", ")}.`,
      'Reply with ONLY a JSON object: {"file": string, "content": string (the COMPLETE new file as a JSON string), "rationale": string, "prediction": {"taskId": string, "minImprovement": number between 0 and 1}}',
    ].join("\n\n");
    const res = await call({ system: "You improve agent harnesses carefully and conservatively.", messages: [{ role: "user", content: prompt }], tools: [] });
    const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    if (!json) throw new Error("the model did not return a JSON object");
    return JSON.parse(json);
  };
}
