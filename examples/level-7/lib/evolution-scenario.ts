// The thing being evolved: a tiny harness whose behavior is set by config FILES (so every change is explicit and revertible),
// and a task suite to measure it on. The "model" is a simulation with a known behavior profile, so the experiment is
// repeatable and free. The tools, the files on disk and the grading are real.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runAgent, type Caller, type Tool } from "../../level-5/lib/agent.ts";
import { textReply, toolReply } from "../../level-5/lib/fake-model.ts";
import { createTracer, type TraceEvent } from "../../level-6/lib/trace.ts";
import { mulberry32 } from "../../level-6/lib/stats.ts";

export type ReadToolConfig = { cap: number; truncationPointer: boolean };

export const DEFAULT_HARNESS_FILES: Record<string, string> = {
  // EDITABLE: the evolution loop may propose changes to these.
  "read-tool.json": JSON.stringify({ cap: 6000, truncationPointer: false }, null, 2) + "\n",
  "verify.json": JSON.stringify({ announceChecks: false }, null, 2) + "\n",
  // PROTECTED: the loop must never be able to change these, however good the argument sounds.
  "permissions.json": JSON.stringify({ bash: "ask", network: "deny" }, null, 2) + "\n",
};
export const EDITABLE_FILES = ["read-tool.json", "verify.json"] as const;
export const PROTECTED_FILES = ["permissions.json"] as const;

export function makeHarnessDir(files: Record<string, string> = DEFAULT_HARNESS_FILES): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-"));
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
  return dir;
}

export const readConfig = (harnessDir: string): ReadToolConfig => JSON.parse(fs.readFileSync(path.join(harnessDir, "read-tool.json"), "utf8"));

// ── Tasks ─────────────────────────────────────────────────────────────

export type ScenarioTask = { id: string; kind: "target" | "regression"; file: string; text: string; setting: string };

const tail = ["export const TIMEOUT_MS = 30000;", "export const MAX_CONNECTIONS = 50;", 'export const REGION = "eu-west-1";'];
const filler = (n: number) => Array.from({ length: n }, (_, i) => `// option ${i}: see the deployment guide for the details of this setting`);

export const TASKS: ScenarioTask[] = [
  // The setting sits after the default read cap, so a silently truncating tool hides it.
  { id: "edit-after-cap", kind: "target", file: "config.ts", text: [...["export const APP_NAME = \"widgets\";"], ...filler(95), ...tail].join("\n") + "\n", setting: "TIMEOUT_MS" },
  // A small file that fits under any sane cap. A good change must not break this.
  { id: "edit-small-file", kind: "regression", file: "small.ts", text: [...["export const APP_NAME = \"widgets\";"], ...filler(4), ...tail].join("\n") + "\n", setting: "TIMEOUT_MS" },
  // A medium file (about 4.4K characters): it fits under the default cap, but not under a smaller one.
  { id: "edit-medium-file", kind: "regression", file: "medium.ts", text: [...["export const APP_NAME = \"widgets\";"], ...filler(60), ...tail].join("\n") + "\n", setting: "TIMEOUT_MS" },
];

const exportsOf = (text: string) => [...text.matchAll(/export const (\w+)/g)].map((m) => m[1]!);

/** Pass only if the setting is 60000 AND nothing else in the file was lost. */
export function grade(dir: string, task: ScenarioTask): boolean {
  const now = fs.readFileSync(path.join(dir, task.file), "utf8");
  const kept = exportsOf(task.text).every((name) => exportsOf(now).includes(name));
  return kept && now.includes(`${task.setting} = 60000;`);
}

// ── Tools (real) ──────────────────────────────────────────────────────

function tools(dir: string, task: ScenarioTask, cfg: ReadToolConfig): Tool[] {
  const file = path.join(dir, task.file);
  return [
    {
      name: "read_file", description: "Read a file", input_schema: { type: "object", properties: { file: { type: "string" }, offset: { type: "number" } } },
      run: (input) => {
        const offset = (input as { offset?: number }).offset ?? 0;
        const text = fs.readFileSync(file, "utf8");
        const end = Math.min(text.length, offset + cfg.cap);
        const piece = text.slice(offset, end);
        if (end >= text.length) return piece;
        return cfg.truncationPointer ? `${piece}\n[truncated: showing ${offset}-${end} of ${text.length} chars. Call read_file with offset ${end} to continue.]` : piece;
      },
    },
    { name: "write_file", description: "Overwrite the whole file", input_schema: { type: "object", properties: {} }, run: (input) => { fs.writeFileSync(file, (input as { content: string }).content); return "wrote file"; } },
    {
      name: "replace_in_file", description: "Replace exact text", input_schema: { type: "object", properties: {} },
      run: (input) => {
        const { old, new: replacement } = input as { old: string; new: string };
        const text = fs.readFileSync(file, "utf8");
        if (!text.includes(old)) throw new Error("text not found");
        fs.writeFileSync(file, text.replace(old, replacement));
        return "replaced";
      },
    },
    { name: "run_checks", description: "Run checks", input_schema: { type: "object", properties: {} }, run: () => (grade(dir, task) ? "all checks passed" : "FAILED") },
  ];
}

// ── The simulated model ───────────────────────────────────────────────
// Behavior profile (this is the assumption of the experiment, stated plainly):
//  - It only edits text it has actually SEEN. If the setting is not in anything it read, it assumes the setting is
//    missing, "adds" it, and writes the whole file back (this is the destructive mistake from lesson 6.3).
//  - If a tool result says output was truncated and gives a pointer, it follows the pointer 85% of the time, up to 4 reads.
//    The other 15% it ignores the notice and acts on what it has (so the fix is good, not perfect).

export function simulatedModel(task: ScenarioTask, rand: () => number): Caller {
  const newLine = `export const ${task.setting} = 60000;`;
  return async (req) => {
    const results = req.messages.flatMap((m) => (Array.isArray(m.content) ? m.content : [])).filter((b): b is { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean } => (b as { type?: string }).type === "tool_result");
    const calls = req.messages.flatMap((m) => (Array.isArray(m.content) ? m.content : [])).filter((b) => (b as { type?: string }).type === "tool_use") as unknown as { name: string }[];
    if (results.length === 0) return toolReply([{ name: "read_file", input: { file: task.file } }]);

    const last = results.at(-1)!;
    const lastTool = calls.at(-1)!.name;
    const seen = results.map((r) => String(r.content)).join("\n");
    const reads = calls.filter((c) => c.name === "read_file").length;

    if (last.is_error) return textReply("I could not complete the edit.");
    if (lastTool === "replace_in_file") return toolReply([{ name: "run_checks", input: {} }]);
    if (lastTool === "run_checks" || lastTool === "write_file") return textReply("Done.");

    // lastTool === "read_file"
    if (seen.includes(`${task.setting} = 30000`)) return toolReply([{ name: "replace_in_file", input: { old: `${task.setting} = 30000`, new: `${task.setting} = 60000` } }]);
    const pointer = String(last.content).match(/Call read_file with offset (\d+)/);
    if (pointer) {
      if (reads < 5 && rand() < 0.85) return toolReply([{ name: "read_file", input: { file: task.file, offset: Number(pointer[1]) } }]);
      if (reads >= 5) return textReply("I could not find the setting.");
    }
    // It believes it has seen the whole file and the setting is absent: add it and write everything back.
    return toolReply([{ name: "write_file", input: { file: task.file, content: seen.replace(/\n\[truncated[^\n]*\]/g, "") + "\n" + newLine + "\n" } }]);
  };
}

// ── One trial ─────────────────────────────────────────────────────────

export async function runTrial(harnessDir: string, task: ScenarioTask, seed: number): Promise<{ pass: boolean; events: TraceEvent[] }> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `evo-${task.id}-`));
  try {
    fs.writeFileSync(path.join(dir, task.file), task.text);
    const events: TraceEvent[] = [];
    const tracer = createTracer((e) => events.push(e));
    const result = await runAgent({
      system: "You change configuration files.",
      task: `Set ${task.setting} in ${task.file} to 60000.`,
      tools: tracer.tools(tools(dir, task, readConfig(harnessDir))),
      call: tracer.call(simulatedModel(task, mulberry32(seed))),
      maxTurns: 12,
    });
    events.push({ type: "run_end", finished: result.finished, turns: result.turns });
    return { pass: grade(dir, task), events };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
