// MILESTONE 3: the system prompt, with project instructions loaded from AGENTS.md / CLAUDE.md files.
// Every production harness in the eleven-system study does this. Read your neighbours' filenames too.
import fs from "node:fs";
import path from "node:path";
import type { SkillInfo } from "./skills.ts";

const NAMES = ["AGENTS.md", "CLAUDE.md"];

/**
 * Collect instruction files from the project root down to the working folder, outermost first.
 * Later (closer) files come later in the prompt, so they naturally win when instructions conflict.
 */
export function loadContextFiles(cwd: string, root: string): { path: string; content: string }[] {
  const rootDir = path.resolve(root);
  const dirs: string[] = [];
  for (let d = path.resolve(cwd); ; d = path.dirname(d)) {
    dirs.unshift(d);
    if (d === rootDir || d === path.dirname(d)) break;
  }
  return dirs.flatMap((dir) =>
    NAMES.flatMap((name) => {
      const file = path.join(dir, name);
      return fs.existsSync(file) ? [{ path: path.relative(rootDir, file).split(path.sep).join("/"), content: fs.readFileSync(file, "utf8").trim() }] : [];
    }),
  );
}

export function buildSystemPrompt(opts: { cwd: string; root: string; skills?: SkillInfo[] }): string {
  const files = loadContextFiles(opts.cwd, opts.root);
  const parts = [
    "You are a coding agent working inside the user's project. You have tools to read, write and edit files and to run shell commands.",
    "Read a file before you change it. Make the smallest change that does the job. Run the project's checks after you change code, and report what they said.",
    `Working folder: ${opts.cwd}`,
  ];
  if (files.length) {
    parts.push("Project instructions follow. When two files disagree, the one listed LATER is closer to the files you are working on and takes priority.");
    for (const f of files) parts.push(`<project-instructions file="${f.path}">\n${f.content}\n</project-instructions>`);
  }
  if (opts.skills?.length) {
    // Progressive disclosure: only names and descriptions go in the prompt. The body loads on demand with load_skill.
    parts.push("Skills you can load with the load_skill tool when a task matches:\n" + opts.skills.map((s) => `- ${s.name}: ${s.description}`).join("\n"));
  }
  return parts.join("\n\n");
}
