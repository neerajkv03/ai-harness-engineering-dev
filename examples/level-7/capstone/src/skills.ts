// MILESTONE 6: skills, using the open Agent Skills layout: <dir>/<name>/SKILL.md with name and description frontmatter.
// Only the description is advertised in the prompt. The body is loaded on demand: progressive disclosure.
import fs from "node:fs";
import path from "node:path";
import type { Tool } from "./types.ts";

export type SkillInfo = { name: string; description: string; file: string };

const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function discoverSkills(dir: string): SkillInfo[] {
  if (!fs.existsSync(dir)) return [];
  const skills: SkillInfo[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name, "SKILL.md");
    if (!entry.isDirectory() || !fs.existsSync(file)) continue;
    const front = fs.readFileSync(file, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
    const field = (k: string) => front.match(new RegExp(`^${k}:\\s*(.+)$`, "m"))?.[1]?.trim();
    const name = field("name");
    const description = field("description");
    // A skill without a valid name or a description cannot be routed to, so it is skipped, not half-loaded.
    if (name && description && NAME.test(name) && name.length <= 64 && description.length <= 1024) skills.push({ name, description, file });
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

export function loadSkillTool(skills: SkillInfo[]): Tool {
  return {
    name: "load_skill",
    description: "Load the full instructions of a skill by name. Use it when the task matches a skill's description.",
    input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
    run: (input) => {
      const { name } = input as { name: string };
      const skill = skills.find((s) => s.name === name);
      if (!skill) throw new Error(`no skill named "${name}". Available: ${skills.map((s) => s.name).join(", ") || "none"}`);
      return fs.readFileSync(skill.file, "utf8").replace(/^---[\s\S]*?---\r?\n/, "").trim();
    },
  };
}
