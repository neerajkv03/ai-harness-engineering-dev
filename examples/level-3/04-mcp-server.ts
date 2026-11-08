// Lesson 3.4: the same http_status logic as an MCP server, so any MCP client (Pi, Claude, an IDE) can use it.
// Uses the v2 MCP TypeScript SDK (@modelcontextprotocol/server).
// Run it from an MCP client, for example with Pi:  pi mcp add http-status -- bun run examples/level-3/04-mcp-server.ts
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { checkStatus, formatResult } from "./03-pi-extension-http-status/http-status-core.ts";

const server = new McpServer({ name: "http-status", version: "1.0.0" });

server.registerTool(
  "http_status",
  {
    description:
      "Check whether a URL responds, using a HEAD request. Returns the status code, response time and any redirect target.",
    inputSchema: z.object({ url: z.string().describe("Full http or https URL, e.g. https://example.com/health") }),
  },
  async ({ url }) => {
    try {
      return { content: [{ type: "text", text: formatResult(await checkStatus(url)) }] };
    } catch (err) {
      // MCP convention: report tool failures as isError results, not as protocol errors.
      return { isError: true, content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }] };
    }
  },
);

// With the stdio transport, stdout IS the protocol channel. Never console.log here: use console.error for logs.
await server.connect(new StdioServerTransport());
