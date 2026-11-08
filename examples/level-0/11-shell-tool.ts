// Lesson 0.4: the most important agent tool is a shell. Return stdout, stderr AND the exit code.
// Run: bun run examples/level-0/11-shell-tool.ts   (run it inside a git repo)
import Anthropic from "@anthropic-ai/sdk";
import { execFile } from "node:child_process";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";

// A deliberately narrow tool: it can only run `git status`. No arguments from the model reach the shell.
const gitStatus: Anthropic.Tool = {
  name: "git_status",
  description: "Show the working tree status of the current git repository (short format).",
  input_schema: { type: "object", properties: {} },
};

function runGitStatus(): Promise<string> {
  return new Promise((resolve) => {
    execFile("git", ["status", "--short"], { timeout: 10_000 }, (error, stdout, stderr) => {
      // error.code is the exit code for a non-zero exit. The model needs all three to reason about what happened.
      const exitCode = error ? ((error as NodeJS.ErrnoException & { code?: number | string }).code ?? 1) : 0;
      resolve(JSON.stringify({ exitCode, stdout, stderr }));
    });
  });
}

const messages: Anthropic.MessageParam[] = [{ role: "user", content: "Are there uncommitted changes? Use the tool." }];

const first = await client.messages.create({ model: MODEL, max_tokens: 16000, tools: [gitStatus], messages });
const call = first.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
if (!call) throw new Error("model did not call the tool");

messages.push({ role: "assistant", content: first.content });
messages.push({
  role: "user",
  content: [{ type: "tool_result", tool_use_id: call.id, content: await runGitStatus() }],
});

const final = await client.messages.create({ model: MODEL, max_tokens: 16000, tools: [gitStatus], messages });
console.log(final.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text);
