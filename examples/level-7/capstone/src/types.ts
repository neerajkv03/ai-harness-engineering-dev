// The capstone harness is self-contained: it does not import anything from the earlier levels. Read it top to bottom.
import type Anthropic from "@anthropic-ai/sdk";

export type Message = Anthropic.MessageParam;

/** The ONLY thing the harness needs from a model: messages in, a message out. A fake can stand in for Claude. */
export type Caller = (req: { system: string; messages: Message[]; tools: Anthropic.Tool[] }) => Promise<Anthropic.Message>;

export type Tool = {
  name: string;
  description: string;
  input_schema: Anthropic.Tool["input_schema"];
  run: (input: unknown) => Promise<string> | string;
};

export type ToolCall = { name: string; input: unknown };

/** Hooks are how behavior is added without editing the loop: policy, logging, formatting. */
export type Hooks = {
  /** Return { block: reason } to stop the tool from running. The model sees the reason as an error. */
  beforeTool?: (call: ToolCall) => void | { block: string } | Promise<void | { block: string }>;
  afterTool?: (call: ToolCall & { output: string; isError: boolean; ms: number }) => void | Promise<void>;
  afterModel?: (e: { turn: number; usage: { input: number; output: number; cacheRead: number; cacheWrite: number }; stop: string; ms: number }) => void;
};

/** `finished` is true only for a complete answer (`end_turn`). `stopReason` says why an unfinished run stopped. */
export type RunResult = { text: string; turns: number; finished: boolean; stopReason?: string; messages: Message[] };
