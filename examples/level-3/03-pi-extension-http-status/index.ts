// Pi extension: adds an `http_status` tool. Copy this folder to ~/.pi/agent/extensions/http-status/
// (or .pi/extensions/http-status/ in a trusted project), then run /reload in Pi.
// Try it without installing: pi -e ./index.ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { checkStatus, formatResult } from "./http-status-core.ts";

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
      if (signal?.aborted) return { content: [{ type: "text", text: "Cancelled" }], details: {} };
      // Throwing marks the result as an error for the model; the message becomes its feedback.
      const result = await checkStatus(params.url);
      return {
        content: [{ type: "text", text: formatResult(result) }], // what the model sees
        details: result, // structured data for rendering and state; not sent to the model as text
      };
    },
  });
}
