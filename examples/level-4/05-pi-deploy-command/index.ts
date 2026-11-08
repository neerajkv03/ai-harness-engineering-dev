// Pi extension: a /deploy-preview slash command with tab-completion, a confirmation step, and a status line.
// Try it: pi -e ./index.ts   then type /deploy-preview and press Tab.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { completions, parseEnvironment } from "./deploy-logic.ts";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("deploy-preview", {
    description: "Deploy a preview build to dev or staging",
    getArgumentCompletions: completions,
    handler: async (args, ctx) => {
      // Print and JSON modes have no UI: confirm() cannot ask anyone. Refuse rather than deploy unconfirmed.
      if (!ctx.hasUI) return;
      const parsed = parseEnvironment(args);
      if (!parsed.ok) {
        ctx.ui.notify(parsed.message, "warning");
        return;
      }

      // Anything that changes a shared environment goes behind an explicit confirmation. The timeout means
      // walking away counts as "no".
      const ok = await ctx.ui.confirm(`Deploy to ${parsed.env}?`, "This runs scripts/deploy-preview.sh", { timeout: 30_000 });
      if (!ok) {
        ctx.ui.notify("Deploy cancelled.", "info");
        return;
      }

      ctx.ui.setStatus("deploy", `Deploying to ${parsed.env}...`);
      try {
        // pi.exec runs a program without a shell, so the argument cannot be used to inject extra commands.
        const result = await pi.exec("bash", ["scripts/deploy-preview.sh", parsed.env], { cwd: ctx.cwd, timeout: 120_000 });
        ctx.ui.notify(result.code === 0 ? `Deployed to ${parsed.env}.` : `Deploy failed (exit ${result.code}): ${result.stderr.slice(0, 200)}`, result.code === 0 ? "info" : "error");
      } finally {
        ctx.ui.setStatus("deploy", undefined); // always clear the status line
      }
    },
  });
}
