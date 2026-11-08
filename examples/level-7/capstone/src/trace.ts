// MILESTONE 8: tracing. Every model call and tool call becomes one JSON line, so a failed run can be read, not guessed at.
// The fields match Level 6's TraceEvent, so Level 6's summarizer and trace analyzer can read these files too.
import fs from "node:fs";
import type { Hooks } from "./types.ts";

export type TraceLine =
  | { t: string; type: "model"; turn: number; ms: number; usage: { input: number; output: number; cacheRead: number; cacheWrite: number }; stop: string }
  | { t: string; type: "tool"; turn: number; name: string; input: unknown; ms: number; ok: boolean; outputChars: number; truncated: boolean };

export function traceHooks(file: string): Hooks {
  let turn = 0; // the latest model turn; tool calls belong to the turn that requested them
  const write = (line: Record<string, unknown>) => fs.appendFileSync(file, JSON.stringify({ t: new Date().toISOString(), ...line }) + "\n");
  return {
    afterModel: (e) => {
      turn = e.turn;
      write({ type: "model", turn: e.turn, ms: Math.round(e.ms), usage: e.usage, stop: e.stop });
    },
    afterTool: (e) =>
      write({ type: "tool", turn, name: e.name, input: e.input, ms: Math.round(e.ms), ok: !e.isError, outputChars: e.output.length, truncated: /\[truncated/.test(e.output) }),
  };
}

export function summarizeTrace(file: string) {
  const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as TraceLine);
  const models = lines.filter((l): l is Extract<TraceLine, { type: "model" }> => l.type === "model");
  const tools = lines.filter((l): l is Extract<TraceLine, { type: "tool" }> => l.type === "tool");
  return {
    turns: models.length,
    toolCalls: tools.length,
    toolErrors: tools.filter((t) => !t.ok).length,
    inputTokens: models.reduce((s, m) => s + m.usage.input, 0),
    outputTokens: models.reduce((s, m) => s + m.usage.output, 0),
  };
}
