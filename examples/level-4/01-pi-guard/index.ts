// Pi extension: enforce a policy on every tool call, in code. Rules in AGENTS.md are suggestions; this is not.
// Try it for one run: pi -e ./index.ts      Keep it: copy this folder to ~/.pi/agent/extensions/guard/
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { decideTool } from "./policy.ts";

export default function (pi: ExtensionAPI) {
  // tool_call fires before ANY tool runs (built-in, MCP or custom) and can block it. Returning nothing lets it continue.
  pi.on("tool_call", async (event, ctx) => {
    const verdict = decideTool(event.toolName, event.input, ctx.cwd);
    if (verdict.action === "allow") return;

    // The reason is sent back to the model as the tool's error, so write it for the model.
    if (verdict.action === "deny") return { block: true, reason: `Blocked by policy: ${verdict.reason}.` };

    // "ask": a human decides. With no UI (print or JSON mode) nobody can answer, so fail closed.
    if (!ctx.hasUI) return { block: true, reason: `Needs approval but no UI is available: ${verdict.reason}.` };

    const what = `${event.toolName} ${JSON.stringify(event.input).slice(0, 300)}`;
    const ok = await ctx.ui.confirm("Allow this action?", `${what}\n\n${verdict.reason}`, { timeout: 30_000 });
    if (!ok) return { block: true, reason: "The user declined this action." }; // a timeout also counts as declined
  });
}
