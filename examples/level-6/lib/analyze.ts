// Read a trace and name what went wrong. Fixing the PROMPT for these is a patch; fixing the harness is the cure.
import type { TraceEvent } from "./trace.ts";

export type Finding = {
  kind: "loop" | "repeated_error" | "write_after_truncated_read" | "unverified_edit" | "ran_out_of_turns";
  turn: number;
  evidence: string;
  fix: string; // where to look first: the harness, not the wording of the prompt
};

type ToolEvent = Extract<TraceEvent, { type: "tool" }>;

/** JSON with sorted keys, so reordered arguments still count as the same call. */
const stable = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(stable).join(",")}]`
    : v && typeof v === "object"
      ? `{${Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => `${JSON.stringify(k)}:${stable(x)}`).join(",")}}`
      : JSON.stringify(v) ?? "null";

const fileOf = (input: unknown): string | undefined => {
  const o = input as { file?: unknown; path?: unknown } | null;
  const f = o?.file ?? o?.path;
  return typeof f === "string" ? f : undefined;
};

export function analyze(
  events: TraceEvent[],
  opts: {
    readTools?: string[];
    writeTools?: string[]; // tools that overwrite a whole file
    editTools?: string[]; // every tool that changes files
    verifyTools?: string[]; // tools that check the work (tests, lint, build)
    readCap?: number; // the size at which the read tool cuts output off
  } = {},
): Finding[] {
  const { readTools = ["read_file"], writeTools = ["write_file"], editTools = ["write_file", "replace_in_file"], verifyTools = ["run_checks", "run_tests"], readCap } = opts;
  const tools = events.filter((e): e is ToolEvent => e.type === "tool");
  const findings: Finding[] = [];

  // 1. Loop: the same tool with the same arguments three or more times.
  const seen = new Map<string, number>();
  for (const t of tools) {
    const key = `${t.name}:${stable(t.input)}`;
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    if (n === 3) findings.push({ kind: "loop", turn: t.turn, evidence: `${t.name} called with identical arguments 3 times`, fix: "Add a loop guard (5.3). Check that the tool's error or empty result tells the model what to do differently." });
  }

  // 2. Repeated error: the same tool failing twice in a row.
  for (let i = 1; i < tools.length; i++) {
    const a = tools[i - 1]!;
    const b = tools[i]!;
    if (!a.ok && !b.ok && a.name === b.name) {
      findings.push({ kind: "repeated_error", turn: b.turn, evidence: `${b.name} failed twice in a row: ${b.error ?? "unknown error"}`, fix: "Improve the error message (3.1): say which field was wrong and show a valid example." });
      break;
    }
  }

  // 3. A whole-file write after a read that was cut off: the model rewrote a file it never fully saw.
  tools.forEach((w, j) => {
    if (!writeTools.includes(w.name)) return;
    const file = fileOf(w.input);
    const lastRead = tools.slice(0, j).reverse().find((r) => readTools.includes(r.name) && fileOf(r.input) === file);
    if (!lastRead) return;
    const markedCut = lastRead.truncated;
    const silentlyCut = !markedCut && readCap !== undefined && lastRead.outputChars >= readCap;
    if (markedCut || silentlyCut) {
      findings.push({
        kind: "write_after_truncated_read",
        turn: w.turn,
        evidence: `${lastRead.name}(${file}) returned ${lastRead.outputChars} chars${silentlyCut ? ", exactly the size cap, with no truncation notice" : " with a truncation notice"}, then ${w.name} overwrote the whole file`,
        fix: "Make truncation visible and give a pointer to the rest (3.1). Prefer an exact-match edit tool over whole-file writes.",
      });
    }
  });

  // 4. Edited files but never ran a check afterwards.
  const lastEdit = tools.map((t, i) => ({ t, i })).filter(({ t }) => editTools.includes(t.name)).at(-1);
  if (lastEdit && !tools.slice(lastEdit.i + 1).some((t) => verifyTools.includes(t.name))) {
    findings.push({ kind: "unverified_edit", turn: lastEdit.t.turn, evidence: `the last change (${lastEdit.t.name}) was never followed by a check`, fix: "Give the agent a check tool, and gate completion on it in the harness (5.2). Do not rely on 'remember to run the tests'." });
  }

  // 5. The run hit its turn cap.
  const end = events.find((e): e is Extract<TraceEvent, { type: "run_end" }> => e.type === "run_end");
  if (end && !end.finished) findings.push({ kind: "ran_out_of_turns", turn: end.turns, evidence: `stopped at ${end.turns} turns without a final answer`, fix: "Check for loops, or split the task (5.1)." });

  return findings;
}
