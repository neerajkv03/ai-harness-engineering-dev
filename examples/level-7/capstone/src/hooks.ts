// MILESTONE 5: hooks. Policy lives here, in code, not in the prompt. (Lesson 4.1 and 4.2 in 40 lines.)
import type { Hooks } from "./types.ts";

const DANGEROUS: [RegExp, string][] = [
  [/\brm\s+-[a-zA-Z]*[rR]/, "recursive delete"],
  [/\bgit\s+push\b.*(--force|\s-f\b|\s\+)/, "force push"],
  [/\|\s*(sudo\s+)?(ba|z)?sh\b/, "piping text into a shell"],
  [/(^|[\s/\\:=])\.env(\.|$|\s)/, "touching a secrets file"],
  [/\bsudo\b/, "sudo"],
];

/** Block known-dangerous shell commands. A safety net, NOT a sandbox: pair it with real isolation (lesson 4.3). */
export const bashGuard: Hooks = {
  beforeTool: ({ name, input }) => {
    if (name !== "bash") return;
    const command = String((input as { command?: unknown }).command ?? "");
    const hit = DANGEROUS.find(([re]) => re.test(command));
    if (hit) return { block: `${hit[1]} is not allowed. Use a safer approach or ask the user.` };
  },
};

/** Combine several hook sets. The first beforeTool that blocks wins; every afterTool and afterModel runs. */
export function composeHooks(...sets: Hooks[]): Hooks {
  return {
    beforeTool: async (call) => {
      for (const h of sets) {
        const verdict = await h.beforeTool?.(call);
        if (verdict && "block" in verdict) return verdict;
      }
    },
    afterTool: async (e) => { for (const h of sets) await h.afterTool?.(e); },
    afterModel: (e) => { for (const h of sets) h.afterModel?.(e); },
  };
}
