// MILESTONE 2: four tools. read, write, edit, bash. (The study's advice: start with bash, add file tools when truncation
// or token waste shows up, and make edits an exact, unique-substring replacement, never line numbers.)
import { exec } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { Tool } from "./types.ts";

const READ_LIMIT = 8000;
const BASH_LIMIT = 8000;

export function createTools(root: string): Tool[] {
  const base = path.resolve(root);
  // Paths come from the model, so they are untrusted: keep them inside the project folder.
  const safe = (p: string): string => {
    const full = path.resolve(base, p.replace(/^@/, ""));
    if (full !== base && !full.startsWith(base + path.sep)) throw new Error(`path "${p}" is outside the project folder`);
    return full;
  };
  const str = (v: unknown, name: string): string => {
    if (typeof v !== "string") throw new Error(`"${name}" must be a string`);
    return v;
  };

  return [
    {
      name: "read",
      description: `Read a text file. Returns up to ${READ_LIMIT} characters starting at "offset" (default 0). If the file is longer, the result says how to continue.`,
      input_schema: { type: "object", properties: { path: { type: "string" }, offset: { type: "number" } }, required: ["path"] },
      run: async (input) => {
        const { path: p, offset = 0 } = input as { path: string; offset?: number };
        const text = await fs.readFile(safe(str(p, "path")), "utf8");
        const end = Math.min(text.length, offset + READ_LIMIT);
        const piece = text.slice(offset, end);
        // Never truncate silently: say what was cut and how to get the rest.
        return end < text.length ? `${piece}\n[truncated: showing ${offset}-${end} of ${text.length} characters. Call read with offset ${end} to continue.]` : piece;
      },
    },
    {
      name: "write",
      description: "Create or overwrite a whole file. Prefer `edit` for changes to an existing file.",
      input_schema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] },
      run: async (input) => {
        const { path: p, content } = input as { path: string; content: string };
        const full = safe(str(p, "path"));
        await fs.mkdir(path.dirname(full), { recursive: true });
        await fs.writeFile(full, str(content, "content"));
        return `wrote ${p} (${content.length} characters)`;
      },
    },
    {
      name: "edit",
      description: "Replace one exact piece of text in a file. `old` must appear exactly once. Include enough surrounding text to make it unique.",
      input_schema: { type: "object", properties: { path: { type: "string" }, old: { type: "string" }, new: { type: "string" } }, required: ["path", "old", "new"] },
      run: async (input) => {
        const { path: p, old, new: replacement } = input as { path: string; old: string; new: string };
        const full = safe(str(p, "path"));
        const text = await fs.readFile(full, "utf8");
        const count = str(old, "old") === "" ? 0 : text.split(old).length - 1;
        if (count === 0) throw new Error(`"old" was not found in ${p}. Read the file again: it may have changed.`);
        if (count > 1) throw new Error(`"old" matches ${count} places in ${p}. Add more surrounding text so it matches exactly one.`);
        await fs.writeFile(full, text.replace(old, () => str(replacement, "new")));
        return `edited ${p}`;
      },
    },
    {
      name: "bash",
      description: "Run a shell command in the project folder. Returns the exit code, then the end of the output. 30 second limit.",
      input_schema: { type: "object", properties: { command: { type: "string" } }, required: ["command"] },
      run: (input) =>
        new Promise((resolve) => {
          const { command } = input as { command: string };
          exec(str(command, "command"), { cwd: base, timeout: 30_000, maxBuffer: 10_000_000 }, (error, stdout, stderr) => {
            const out = `${stdout}${stderr}`;
            // Keep the END of long output: that is where failures and summaries are.
            const shown = out.length > BASH_LIMIT ? `[output truncated, showing the last ${BASH_LIMIT} of ${out.length} characters]\n${out.slice(-BASH_LIMIT)}` : out;
            const code = error ? (typeof error.code === "number" ? error.code : error.killed ? "timeout" : 1) : 0;
            resolve(`exit code: ${code}\n${shown}`);
          });
        }),
    },
  ];
}
