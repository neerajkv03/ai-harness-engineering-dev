// File tools confined to one folder. Model-supplied paths are untrusted (see Level 4).
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Tool } from "./agent.ts";

export function fileTools(root: string, opts: { write?: boolean } = {}): Tool[] {
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
      description: "Read a text file, relative to the working folder. Returns at most 6000 characters.",
      input_schema: { type: "object", properties: { file: { type: "string" } }, required: ["file"] },
      run: async (input) => {
        const { file } = z.object({ file: z.string() }).parse(input);
        const text = await fs.readFile(safe(file), "utf8");
        return text.length > 6000 ? `${text.slice(0, 6000)}\n...[truncated, ${text.length} chars total]` : text;
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
        await fs.mkdir(path.dirname(safe(file)), { recursive: true });
        await fs.writeFile(safe(file), content);
        return `wrote ${file} (${content.length} chars)`;
      },
    });
  }
  return tools;
}
