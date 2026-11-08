// A minimal agent loop you can reuse in every Level 5 example.
// The model call is injected (`Caller`), so the same loop runs against Claude or, in tests, a scripted fake.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export type Tool = {
  name: string;
  description: string;
  input_schema: Anthropic.Tool["input_schema"];
  run: (input: unknown) => Promise<string> | string;
};

export type Caller = (req: {
  system: string;
  messages: Anthropic.MessageParam[];
  tools: Anthropic.Tool[];
}) => Promise<Anthropic.Message>;

export function anthropicCaller(model = "claude-opus-5-5", maxTokens = 4096): Caller {
  const client = new Anthropic();
  return (req) =>
    client.messages.create({
      model,
      max_tokens: maxTokens,
      system: req.system,
      messages: req.messages,
      ...(req.tools.length > 0 && { tools: req.tools }),
    });
}

export type RunResult = {
  text: string;
  turns: number;
  messages: Anthropic.MessageParam[];
  inputTokens: number;
  outputTokens: number;
  finished: boolean; // false when the loop hit maxTurns without a final answer
};

const textOf = (m: Anthropic.Message): string =>
  m.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");

export async function runAgent(opts: {
  system: string;
  task: string;
  call: Caller;
  tools?: Tool[];
  maxTurns?: number; // always cap the loop
  /** Called before each tool runs. Throw to abort the whole run (used by the loop guard). */
  beforeTool?: (name: string, input: unknown) => void;
}): Promise<RunResult> {
  const { system, task, call, tools = [], maxTurns = 12, beforeTool } = opts;
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: task }];
  const toolDefs: Anthropic.Tool[] = tools.map(({ name, description, input_schema }) => ({ name, description, input_schema }));
  let inputTokens = 0;
  let outputTokens = 0;

  for (let turn = 1; turn <= maxTurns; turn++) {
    const res = await call({ system, messages, tools: toolDefs });
    inputTokens += res.usage.input_tokens;
    outputTokens += res.usage.output_tokens;
    messages.push({ role: "assistant", content: res.content });

    if (res.stop_reason !== "tool_use") {
      return { text: textOf(res), turns: turn, messages, inputTokens, outputTokens, finished: true };
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of res.content) {
      if (block.type !== "tool_use") continue;
      beforeTool?.(block.name, block.input); // may throw: that aborts the run
      const tool = tools.find((t) => t.name === block.name);
      try {
        if (!tool) throw new Error(`unknown tool "${block.name}"`);
        results.push({ type: "tool_result", tool_use_id: block.id, content: await tool.run(block.input) });
      } catch (err) {
        // Tell the model what went wrong instead of crashing. It can recover.
        results.push({ type: "tool_result", tool_use_id: block.id, is_error: true, content: String(err instanceof Error ? err.message : err) });
      }
    }
    messages.push({ role: "user", content: results });
  }
  return { text: "", turns: maxTurns, messages, inputTokens, outputTokens, finished: false };
}

/**
 * A tool that hands a task to a helper agent with a FRESH context. The helper sees only `task`, and only its
 * final report comes back, so the main agent's window never fills with the helper's file reads.
 */
export function delegateTool(opts: {
  call: Caller;
  system: string;
  tools: Tool[];
  maxTurns?: number;
  onResult?: (result: RunResult) => void;
}): Tool {
  const Input = z.object({
    task: z.string().min(60, "task is too short. Write a full brief: the goal, the scope, what to skip, and the exact output format you want back."),
  });
  return {
    name: "delegate",
    description:
      "Hand a self-contained task to a helper agent with a fresh context. The helper knows ONLY what you write in `task`. " +
      "Returns the helper's final report.",
    input_schema: {
      type: "object",
      properties: { task: { type: "string", description: "Goal, scope, what to skip, and the exact output format you want back." } },
      required: ["task"],
    },
    run: async (input) => {
      const { task } = Input.parse(input);
      const result = await runAgent({ system: opts.system, task, tools: opts.tools, call: opts.call, maxTurns: opts.maxTurns ?? 8 });
      opts.onResult?.(result);
      return result.finished ? result.text : "The helper ran out of turns before finishing. Narrow the task and try again.";
    },
  };
}
