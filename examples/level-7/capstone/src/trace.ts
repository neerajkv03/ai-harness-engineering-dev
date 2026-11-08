// MILESTONE 8: tracing. Every model call and tool call becomes one JSON line, so a failed run can be read, not guessed at.
import fs from "node:fs";
import type { Hooks } from "./types.ts";

export type TraceLine =
  | { t: string; type: "model"; turn: number; ms: number; usage: { input: number; output: number }; stop: string }
  | { t: string; type: "tool"; name: string; input: unknown; ms: number; ok: boolean; chars: number };

export function traceHooks(file: string): Hooks {
  const write = (line: Omit<TraceLine, "t"> & Record<string, unknown>) => fs.appendFileSync(file, JSON.stringify({ t: new Date().toISOString(), ...line }) + "\n");
  return {
    afterModel: (e) => write({ type: "model", turn: e.turn, ms: Math.round(e.ms), usage: e.usage, stop: e.stop }),
    afterTool: (e) => write({ type: "tool", name: e.name, input: e.input, ms: Math.round(e.ms), ok: !e.isError, chars: e.output.length }),
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
