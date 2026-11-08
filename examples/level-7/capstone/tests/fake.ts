// A scripted stand-in for the model, for the acceptance tests. No API key, no network.
import type Anthropic from "@anthropic-ai/sdk";
import type { Caller, Message } from "../src/types.ts";

const message = (content: unknown[], stop: string, usage = { input: 100, output: 20 }) =>
  ({ id: "msg", type: "message", role: "assistant", model: "fake", content, stop_reason: stop, stop_sequence: null, usage: { input_tokens: usage.input, output_tokens: usage.output } }) as unknown as Anthropic.Message;

export const say = (text: string, usage?: { input: number; output: number }) => message([{ type: "text", text }], "end_turn", usage);

let id = 0;
export const use = (...calls: { name: string; input: unknown }[]) => message(calls.map((c) => ({ type: "tool_use", id: `toolu_${++id}`, name: c.name, input: c.input })), "tool_use");

type Req = Parameters<Caller>[0];
export type Step = Anthropic.Message | ((req: Req) => Anthropic.Message | Promise<Anthropic.Message>);

/** Each model call takes the next step. Calling more often than scripted is an error, so tests notice extra calls. */
export function script(steps: Step[]): Caller & { calls: Req[] } {
  let i = 0;
  const calls: Req[] = [];
  const caller = async (req: Req) => {
    calls.push({ ...req, messages: structuredClone(req.messages) }); // snapshot: the loop keeps mutating its array
    const step = steps[i++];
    if (!step) throw new Error(`fake model: no scripted reply for call #${i}`);
    return typeof step === "function" ? step(req) : step;
  };
  return Object.assign(caller, { calls });
}

/** The tool_result blocks the model has been shown so far, in order. */
export const toolResults = (messages: Message[]) =>
  messages.flatMap((m) => (Array.isArray(m.content) ? m.content : [])).filter((b) => b.type === "tool_result") as { tool_use_id: string; content: string; is_error?: boolean }[];
