// Pi extension: adds an `http_status` tool. Copy this folder to ~/.pi/agent/extensions/http-status/
// (or .pi/extensions/http-status/ in a trusted project), then run /reload in Pi.
// Try it without installing: pi -e ./index.ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import { checkStatus, formatResult, type StatusResult } from "./http-status-core.ts";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "http_status",
    label: "HTTP status", // shown in the terminal UI
    description:
      "Check whether a URL responds, using a HEAD request. Returns the status code, response time and any redirect target. " +
      "Use for health checks. It does not return the page body.",
    promptSnippet: "Check the HTTP status of a URL", // one line in the system prompt's tool list
    promptGuidelines: ["Use http_status to check whether a URL is up instead of running curl through bash."], // name the tool in each rule
    parameters: Type.Object({
      url: Type.String({ description: "Full http or https URL, e.g. https://example.com/health" }),
    }),

    async execute(_toolCallId, params, signal) {
      // Pass Pi's signal down, so pressing Esc aborts the request. Throwing (an abort, a bad URL) marks the result as
      // an error for the model and the message becomes its feedback; returning `isError: true` does the same.
      const result = await checkStatus(params.url, fetch, 10_000, signal);
      return {
        content: [{ type: "text", text: formatResult(result) }], // what the model sees
        details: result, // structured data for rendering and state; not sent to the model as text
      };
    },

    // What YOU see in the terminal. Separate from `content`: the model never sees this.
    renderResult(result, { isPartial }, theme) {
      if (isPartial) return new Text(theme.fg("warning", "checking..."), 0, 0);
      const r = result.details as StatusResult | undefined;
      if (!r?.url) return new Text(theme.fg("error", "no result"), 0, 0);
      return new Text(theme.fg(r.ok ? "success" : "error", `${r.status} ${r.ok ? "up" : "not ok"}`) + theme.fg("dim", ` ${r.ms} ms`), 0, 0);
    },
  });
}
