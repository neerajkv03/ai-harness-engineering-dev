// MILESTONE 1: the loop. A linear while loop with a turn cap. Everything else in this harness hangs off it.
// (The eleven-harness study's first recommendation: start with a linear loop; add structure only when you need it.)
import type Anthropic from "@anthropic-ai/sdk";
import type { Caller, Hooks, Message, RunResult, Tool } from "./types.ts";

export async function runLoop(opts: {
  system: string;
  messages: Message[]; // the conversation so far. It is extended IN PLACE, so the caller keeps the full history.
  call: Caller;
  tools: Tool[];
  hooks?: Hooks;
  maxTurns?: number; // always cap the loop
  /** Runs before every model request and may return a smaller history (this is where compaction plugs in). */
  prepare?: (messages: Message[]) => Promise<Message[]>;
}): Promise<RunResult> {
  const { system, messages, call, tools, hooks, maxTurns = 20, prepare } = opts;
  const defs: Anthropic.Tool[] = tools.map(({ name, description, input_schema }) => ({ name, description, input_schema }));

  for (let turn = 1; turn <= maxTurns; turn++) {
    if (prepare) messages.splice(0, messages.length, ...(await prepare(messages)));

    const started = performance.now();
    const res = await call({ system, messages, tools: defs });
    const u = res.usage;
    const usage = { input: u.input_tokens, output: u.output_tokens, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0 };
    hooks?.afterModel?.({ turn, usage, stop: String(res.stop_reason), ms: performance.now() - started });
    messages.push({ role: "assistant", content: res.content });

    if (res.stop_reason === "pause_turn") continue; // the API paused a long turn: send the history back and it resumes
    if (res.stop_reason !== "tool_use") {
      const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
      // Only end_turn (or a stop sequence) is an answer. max_tokens is a cut-off reply; refusal is a declined one.
      const finished = res.stop_reason === "end_turn" || res.stop_reason === "stop_sequence";
      return { text, turns: turn, finished, ...(!finished && { stopReason: String(res.stop_reason) }), messages };
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of res.content) {
      if (block.type !== "tool_use") continue;
      results.push(await execute(block, tools, hooks));
    }
    messages.push({ role: "user", content: results });
  }
  return { text: "", turns: maxTurns, finished: false, messages };
}

async function execute(block: Anthropic.ToolUseBlock, tools: Tool[], hooks?: Hooks): Promise<Anthropic.ToolResultBlockParam> {
  const call = { name: block.name, input: block.input };
  const started = performance.now();
  let output: string;
  let isError = false;
  try {
    const verdict = await hooks?.beforeTool?.(call); // MILESTONE 5 plugs in here
    if (verdict && "block" in verdict) throw new Error(`Blocked: ${verdict.block}`);
    const tool = tools.find((t) => t.name === block.name);
    if (!tool) throw new Error(`unknown tool "${block.name}". Available: ${tools.map((t) => t.name).join(", ")}`);
    output = await tool.run(block.input);
  } catch (err) {
    // A failure is information for the model, not a crash. It can read the message and try something else.
    output = err instanceof Error ? err.message : String(err);
    isError = true;
  }
  await hooks?.afterTool?.({ ...call, output, isError, ms: performance.now() - started });
  return { type: "tool_result", tool_use_id: block.id, content: output, ...(isError && { is_error: true }) };
}
