// File tools confined to one folder. Model-supplied paths are untrusted (see Level 4).
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Tool } from "./agent.ts";

// `writable` (relative paths) limits write_file to those files. Use it whenever a check the agent is graded by
// (tests, a feature list) lives in the same folder: a prompt saying "do not edit tests" is a suggestion, this is not.
export function fileTools(root: string, opts: { write?: boolean; writable?: string[] } = {}): Tool[] {
  const base = path.resolve(root);
  const safe = (rel: string): string => {
    const full = path.resolve(base, rel);
    if (full !== base && !full.startsWith(base + path.sep)) throw new Error(`path "${rel}" is outside the working folder`);
    return full;
  };

  const tools: Tool[] = [
    {
      name: "list_files",
      description: "List files and folders in a folder, relative to the working folder. Use '.' for the root.",
      input_schema: { type: "object", properties: { dir: { type: "string" } }, required: ["dir"] },
      run: async (input) => {
        const { dir } = z.object({ dir: z.string() }).parse(input);
        const entries = await fs.readdir(safe(dir), { withFileTypes: true });
        return entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name)).join("\n") || "(empty)";
      },
    },
    {
      name: "read_file",
      description: "Read a text file, relative to the working folder. Returns at most 6000 characters; pass `offset` to continue a long file.",
      input_schema: { type: "object", properties: { file: { type: "string" }, offset: { type: "integer" } }, required: ["file"] },
      run: async (input) => {
        const { file, offset } = z.object({ file: z.string(), offset: z.number().int().min(0).default(0) }).parse(input);
        const text = await fs.readFile(safe(file), "utf8");
        const end = Math.min(text.length, offset + 6000);
        // Say what was cut and how to get the rest. A silent cut makes the model rewrite files it never fully saw (6.3).
        return end < text.length ? `${text.slice(offset, end)}\n[truncated: showing ${offset}-${end} of ${text.length} chars. Call read_file with offset ${end} to continue.]` : text.slice(offset);
      },
    },
  ];

  if (opts.write) {
    tools.push({
      name: "write_file",
      description: "Create or overwrite a text file, relative to the working folder.",
      input_schema: {
        type: "object",
        properties: { file: { type: "string" }, content: { type: "string" } },
        required: ["file", "content"],
      },
      run: async (input) => {
        const { file, content } = z.object({ file: z.string(), content: z.string().max(50_000) }).parse(input);
        const allowed = opts.writable?.map((f) => safe(f));
        if (allowed && !allowed.includes(safe(file))) throw new Error(`you may only write ${opts.writable!.join(", ")}`);
        await fs.mkdir(path.dirname(safe(file)), { recursive: true });
        await fs.writeFile(safe(file), content);
        return `wrote ${file} (${content.length} chars)`;
      },
    });
  }
  return tools;
}
