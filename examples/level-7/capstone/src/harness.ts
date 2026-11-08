// Wiring: the loop plus the tools, prompt, skills, compaction, hooks, subagent and tracing.
import path from "node:path";
import { compactIfNeeded } from "./compaction.ts";
import { bashGuard, composeHooks } from "./hooks.ts";
import { runLoop } from "./loop.ts";
import { buildSystemPrompt } from "./prompt.ts";
import { discoverSkills, loadSkillTool } from "./skills.ts";
import { delegateTool } from "./subagent.ts";
import { createTools } from "./tools.ts";
import { traceHooks } from "./trace.ts";
import type { Caller, Hooks, Message, RunResult, Tool } from "./types.ts";

export function createHarness(opts: {
  root: string; // the project folder: file tools cannot leave it
  cwd?: string; // where instruction files are read down to (default: root)
  call: Caller;
  skillsDir?: string;
  traceFile?: string;
  compactAtTokens?: number; // set to turn compaction on
  keepRecent?: number;
  hooks?: Hooks; // your own hooks, added after the built-in bash guard
  subagents?: boolean;
  maxTurns?: number;
}) {
  const root = path.resolve(opts.root);
  const cwd = path.resolve(opts.cwd ?? root);
  const skills = opts.skillsDir ? discoverSkills(opts.skillsDir) : [];
  const system = buildSystemPrompt({ cwd, root, skills });

  const tools: Tool[] = createTools(root);
  if (skills.length) tools.push(loadSkillTool(skills));
  if (opts.subagents) {
    // The helper gets fewer powers: it can only read.
    const readOnly = tools.filter((t) => t.name === "read");
    tools.push(delegateTool({ call: opts.call, tools: readOnly, system: "You are a research helper. Read files and report exactly what the task asks for. You cannot change anything." }));
  }

  const hooks = composeHooks(bashGuard, ...(opts.hooks ? [opts.hooks] : []), ...(opts.traceFile ? [traceHooks(opts.traceFile)] : []));
  const prepare = opts.compactAtTokens
    ? (messages: Message[]) => compactIfNeeded({ messages, call: opts.call, thresholdTokens: opts.compactAtTokens!, keepRecent: opts.keepRecent })
    : undefined;

  const history: Message[] = []; // the conversation lives here, across several run() calls

  return {
    system,
    history,
    tools,
    async run(task: string): Promise<RunResult> {
      history.push({ role: "user", content: task });
      return runLoop({ system, messages: history, call: opts.call, tools, hooks, prepare, maxTurns: opts.maxTurns });
    },
  };
}
