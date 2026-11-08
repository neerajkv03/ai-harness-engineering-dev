// Lesson 2.4: file-based memory. One fact per file, an index loaded at startup, recall on demand.
// Run: bun run examples/level-2/06-file-memory.ts
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";
const DIR = path.join(import.meta.dirname, "memory-demo");
const INDEX = path.join(DIR, "INDEX.md");

// Names become filenames, so allow only a safe shape. Never build a path from raw model output.
const Name = z.string().regex(/^[a-z0-9-]{1,40}$/);
// The summary becomes one line of INDEX.md, so a newline in it would corrupt the index.
const RememberInput = z.object({ name: Name, summary: z.string().max(120).regex(/^[^\r\n]*$/, "summary must be one line"), fact: z.string().max(2000) });
const RecallInput = z.object({ name: Name });

const tools: Anthropic.Tool[] = [
  {
    name: "remember",
    description: "Save one durable fact for future sessions. 'name' is a short kebab-case id; 'summary' is one line for the index.",
    input_schema: {
      type: "object",
      properties: { name: { type: "string" }, summary: { type: "string" }, fact: { type: "string" } },
      required: ["name", "summary", "fact"],
    },
  },
  {
    name: "recall",
    description: "Read the full text of one saved memory by name (see the memory index in the system prompt).",
    input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
  },
];

async function runTool(name: string, raw: unknown): Promise<string> {
  if (name === "remember") {
    const { name: id, summary, fact } = RememberInput.parse(raw);
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(path.join(DIR, `${id}.md`), fact);
    const index = (await fs.readFile(INDEX, "utf8").catch(() => "")).split("\n").filter((l) => l && !l.startsWith(`- ${id}:`));
    await fs.writeFile(INDEX, [...index, `- ${id}: ${summary}`].join("\n") + "\n"); // same name overwrites: no duplicates
    return `saved ${id}`;
  }
  if (name === "recall") {
    const { name: id } = RecallInput.parse(raw);
    return await fs.readFile(path.join(DIR, `${id}.md`), "utf8");
  }
  throw new Error(`unknown tool: ${name}`);
}

async function session(userText: string): Promise<string> {
  // A fresh session: empty history, but the INDEX is loaded into the system prompt.
  const index = await fs.readFile(INDEX, "utf8").catch(() => "(no memories yet)");
  const system = [
    "You are an assistant with a small file-based memory.",
    "Save durable facts about the user with `remember`. Use `recall` to read one before relying on it.",
    "Memories can be stale. Treat them as hints and say so if something may have changed.",
    `Memory index:\n${index}`,
  ].join("\n\n");

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userText }];
  for (let turn = 0; turn < 6; turn++) {
    const res = await client.messages.create({ model: MODEL, max_tokens: 16000, system, tools, messages });
    messages.push({ role: "assistant", content: res.content });
    if (res.stop_reason !== "tool_use") {
      return res.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
    }
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of res.content) {
      if (block.type !== "tool_use") continue;
      try {
        results.push({ type: "tool_result", tool_use_id: block.id, content: await runTool(block.name, block.input) });
      } catch (err) {
        results.push({ type: "tool_result", tool_use_id: block.id, is_error: true, content: String(err) });
      }
    }
    messages.push({ role: "user", content: results });
  }
  return "(stopped: too many turns)";
}

console.log("session 1:", await session("Remember that I deploy to Fly.io and my team uses pnpm, not npm."));
console.log("session 2:", await session("Which package manager should I use in the deploy script for my project?"));
// Session 2 has no history from session 1. It knows the answer only because of the files in memory-demo/.
