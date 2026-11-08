// A scripted stand-in for the model, so agent loops can be tested and demonstrated offline.
import type Anthropic from "@anthropic-ai/sdk";
import type { Caller } from "./agent.ts";

type Usage = { input: number; output: number };

function message(content: unknown[], stop_reason: string, usage: Usage): Anthropic.Message {
  return {
    id: "msg_fake",
    type: "message",
    role: "assistant",
    model: "fake",
    content,
    stop_reason,
    stop_sequence: null,
    usage: { input_tokens: usage.input, output_tokens: usage.output },
  } as unknown as Anthropic.Message;
}

export const textReply = (text: string, usage: Usage = { input: 100, output: 20 }): Anthropic.Message =>
  message([{ type: "text", text }], "end_turn", usage);

let nextId = 1;
export const toolReply = (calls: { name: string; input: unknown }[], usage: Usage = { input: 100, output: 20 }): Anthropic.Message =>
  message(
    calls.map((c) => ({ type: "tool_use", id: `toolu_${nextId++}`, name: c.name, input: c.input })),
    "tool_use",
    usage,
  );

type Step = Anthropic.Message | ((req: Parameters<Caller>[0]) => Anthropic.Message | Promise<Anthropic.Message>);

/** Each call consumes the next scripted step. Running out of steps is an error, so tests notice extra calls. */
export function scripted(steps: Step[]): Caller & { calls: Parameters<Caller>[0][] } {
  let i = 0;
  const calls: Parameters<Caller>[0][] = [];
  const caller = async (req: Parameters<Caller>[0]) => {
    calls.push(req);
    const step = steps[i++];
    if (!step) throw new Error(`fake model: no scripted reply for call #${i}`);
    return typeof step === "function" ? step(req) : step;
  };
  return Object.assign(caller, { calls });
}
