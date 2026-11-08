// Find the parts of any harness in an unfamiliar codebase. Every harness has the same seven subsystems
// (loop, LLM integration, tools, memory and context, safety, orchestration, extensibility) plus an interface layer.
// This scans a folder, scores each file against signature words for each subsystem, and lists the top files.
import fs from "node:fs";
import path from "node:path";

export const SUBSYSTEMS = {
  "agent loop": ["stop_reason", "stopReason", "tool_use", "toolUse", "toolcall", "maxTurns", "max_turns", "agentloop", "agent-loop", "runloop", "turn_start", "turn_end"],
  "llm integration": ["provider", "anthropic", "openai", "streamfn", "model-registry", "modelregistry", "cache_control", "thinking", "baseurl"],
  "tools and actions": ["registertool", "toolregistry", "tool_result", "toolresult", "read_file", "execute(", "bash", "truncat"],
  "memory and context": ["compact", "summariz", "agents.md", "claude.md", "contextwindow", "context_window", "systemprompt", "system-prompt", "sessionmanager"],
  "safety and permissions": ["permission", "sandbox", "approve", "approval", "trust", "denylist", "allowlist", "block:", "policy"],
  "orchestration": ["subagent", "sub-agent", "spawn(", "delegate", "handoff", "fork("],
  "extensibility": ["extension", "skill", "mcp", "plugin", "hook", "manifest", "resourceloader", "resource-loader"],
  "interface layer": ["tui", "rpc", "jsonl", "--print", "readline", "stdin", "stdout", "sdk"],
} as const;

export type Subsystem = keyof typeof SUBSYSTEMS;
export type FileScore = { file: string; hits: number; bytes: number };

const CODE = /\.(ts|tsx|js|mjs|cjs|py|rs|go)$/;
const SKIP_DIRS = new Set(["node_modules", ".git", "target", "__pycache__", ".next", "coverage"]);
const BUILD_DIRS = new Set(["dist", "build", "out"]); // compiled copies of src/: skip them only when the source is there too

function* walk(dir: string, depth = 0): Generator<string> {
  if (depth > 12) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const hasSource = entries.some((e) => e.isDirectory() && e.name === "src");
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || (hasSource && BUILD_DIRS.has(entry.name))) continue;
      yield* walk(path.join(dir, entry.name), depth + 1);
    } else if (CODE.test(entry.name) && !/\.(test|spec|d)\.|\.map$/.test(entry.name)) {
      yield path.join(dir, entry.name);
    }
  }
}

/** Count signature words in one file's text, plus its path (a file called `compaction.ts` is evidence too). */
export function scoreText(text: string, file: string, words: readonly string[]): number {
  const hay = (text + "\n" + file).toLowerCase();
  let hits = 0;
  for (const w of words) {
    let i = -1;
    while ((i = hay.indexOf(w.toLowerCase(), i + 1)) >= 0) hits++;
  }
  return hits;
}

export function mapHarness(root: string, topN = 4, maxFileBytes = 400_000): Record<Subsystem, FileScore[]> {
  const result = Object.fromEntries(Object.keys(SUBSYSTEMS).map((k) => [k, [] as FileScore[]])) as Record<Subsystem, FileScore[]>;
  for (const file of walk(root)) {
    const stat = fs.statSync(file);
    if (stat.size > maxFileBytes) continue; // generated bundles and vendored blobs are not where the design lives
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(root, file).split(path.sep).join("/");
    for (const [name, words] of Object.entries(SUBSYSTEMS) as [Subsystem, readonly string[]][]) {
      const hits = scoreText(text, rel, words);
      if (hits > 0) result[name].push({ file: rel, hits, bytes: stat.size });
    }
  }
  for (const name of Object.keys(result) as Subsystem[]) {
    // Density matters more than raw count: a 2KB file full of loop vocabulary beats a 300KB file that mentions it once.
    result[name] = result[name].sort((a, b) => b.hits / Math.sqrt(b.bytes) - a.hits / Math.sqrt(a.bytes)).slice(0, topN);
  }
  return result;
}
