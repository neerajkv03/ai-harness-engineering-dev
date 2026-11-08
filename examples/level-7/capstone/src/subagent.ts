// MILESTONE 7: one subagent. A helper with a FRESH context; only its final report returns to the main agent.
import { runLoop } from "./loop.ts";
import type { Caller, Tool } from "./types.ts";

export function delegateTool(opts: { call: Caller; system: string; tools: Tool[]; maxTurns?: number }): Tool {
  return {
    name: "delegate",
    description: "Hand a self-contained task to a helper with a fresh context. The helper knows ONLY what you write in `task`. Returns its final report.",
    input_schema: { type: "object", properties: { task: { type: "string", description: "Goal, scope, what to skip, and the exact output format you want back." } }, required: ["task"] },
    run: async (input) => {
      const { task } = input as { task: string };
      if (typeof task !== "string" || task.length < 60) throw new Error("task is too short. Write a full brief: the goal, the scope, what to skip, and the output format you want back.");
      const result = await runLoop({ system: opts.system, messages: [{ role: "user", content: task }], call: opts.call, tools: opts.tools, maxTurns: opts.maxTurns ?? 8 });
      return result.finished ? result.text : "The helper ran out of turns before finishing. Narrow the task and try again.";
    },
  };
}
