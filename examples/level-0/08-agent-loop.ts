// Lesson 0.3: an agent is a while loop around tool calling, with a hard turn cap.
// Run: bun run examples/level-0/08-agent-loop.ts [folder]   (default: current folder)
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";
const MAX_TURNS = 10; // always cap the loop
const ROOT = path.resolve(process.argv[2] ?? ".");

// Model-supplied paths are untrusted. Confine them to ROOT.
function safePath(rel: string): string {
  const full = path.resolve(ROOT, rel);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) throw new Error(`path outside root: ${rel}`);
  return full;
}

const tools: Anthropic.Tool[] = [
  {
    name: "list_files",
    description: "List files and folders inside a folder, relative to the project root. Use '.' for the root.",
    input_schema: { type: "object", properties: { dir: { type: "string" } }, required: ["dir"] },
  },
  {
    name: "read_file",
    description: "Read a text file, relative to the project root. Returns at most 4000 characters.",
    input_schema: { type: "object", properties: { file: { type: "string" } }, required: ["file"] },
  },
];

async function runTool(name: string, raw: unknown): Promise<string> {
  if (name === "list_files") {
    const { dir } = z.object({ dir: z.string() }).parse(raw);
    const entries = await fs.readdir(safePath(dir), { withFileTypes: true });
    return entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name)).join("\n");
  }
  if (name === "read_file") {
    const { file } = z.object({ file: z.string() }).parse(raw);
    const text = await fs.readFile(safePath(file), "utf8");
    return text.length > 4000 ? `${text.slice(0, 4000)}\n...[truncated, ${text.length} chars total]` : text;
  }
  throw new Error(`unknown tool: ${name}`);
}

const messages: Anthropic.MessageParam[] = [
  { role: "user", content: "What does this project do? Look at the files, then answer in 3 sentences." },
];

for (let turn = 1; turn <= MAX_TURNS; turn++) {
  const response = await client.messages.create({ model: MODEL, max_tokens: 4096, tools, messages });
  messages.push({ role: "assistant", content: response.content });

  if (response.stop_reason !== "tool_use") {
    // end_turn, max_tokens, refusal... anything but tool_use ends the loop
    const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
    console.log(`[${response.stop_reason} after ${turn} turn(s)]\n${text}`);
    process.exit(0);
  }

  const results: Anthropic.ToolResultBlockParam[] = [];
  for (const block of response.content) {
    if (block.type !== "tool_use") continue;
    console.log(`turn ${turn}: ${block.name}(${JSON.stringify(block.input)})`);
    try {
      results.push({ type: "tool_result", tool_use_id: block.id, content: await runTool(block.name, block.input) });
    } catch (err) {
      // Tell the model what went wrong instead of crashing. It can recover.
      results.push({ type: "tool_result", tool_use_id: block.id, is_error: true, content: String(err) });
    }
  }
  messages.push({ role: "user", content: results });
}
console.error(`stopped: hit MAX_TURNS (${MAX_TURNS}) without a final answer`);
process.exit(1);
