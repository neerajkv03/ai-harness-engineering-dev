// Pi extension: after the agent edits or writes a file, run the project's formatter on it.
// tool_result fires after a tool finishes, so we know the edit succeeded before formatting.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { formatFile, pathToFormat } from "./format-core.ts";

export default function (pi: ExtensionAPI) {
  pi.on("tool_result", async (event, ctx) => {
    const file = pathToFormat(event.toolName, event.input, event.isError);
    if (!file) return;

    const result = await formatFile(ctx.cwd, file);
    // Tell the human, not the model. A formatter problem should not derail the task.
    if (!result.ok && ctx.hasUI) ctx.ui.notify(`Auto-format skipped: ${result.message}`, "warning");
  });
}
