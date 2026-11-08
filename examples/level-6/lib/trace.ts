// Tracing: record every model call and tool call as one JSON line, then summarize or analyze the file.
// A transcript is a stack trace for agent behavior. Without one you are guessing why a run went wrong.
import fs from "node:fs";
import type { Caller, Tool } from "../../level-5/lib/agent.ts";
import { costUsd } from "./pricing.ts";

export type TraceEvent =
  | { type: "model"; turn: number; ms: number; usage: { input: number; output: number; cacheRead: number; cacheWrite: number }; stop: string }
  | { type: "tool"; turn: number; name: string; input: unknown; ms: number; ok: boolean; outputChars: number; truncated: boolean; error?: string }
  | { type: "run_end"; finished: boolean; turns: number };

export type Emit = (event: TraceEvent) => void;
const round = (n: number) => Math.round(n * 10) / 10;

export function createTracer(emit: Emit) {
  let turn = 0; // increments with every model call; tool events carry the turn they belong to
  return {
    /** Wrap the model call: records latency, token usage and why the model stopped. */
    call(inner: Caller): Caller {
      return async (req) => {
        turn++;
        const started = performance.now();
        const res = await inner(req);
        const u = res.usage as unknown as Record<string, number | undefined>;
        emit({
          type: "model",
          turn,
          ms: round(performance.now() - started),
          usage: { input: u.input_tokens ?? 0, output: u.output_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0 },
          stop: String(res.stop_reason),
        });
        return res;
      };
    },
    /** Wrap tools: records arguments, latency, success and result size. Errors are logged, then re-thrown unchanged. */
    tools(tools: Tool[]): Tool[] {
      return tools.map((tool) => ({
        ...tool,
        run: async (input: unknown) => {
          const started = performance.now();
          try {
            const out = await tool.run(input);
            // `truncated` looks for the "[truncated" marker our own tools write; tools with another format need their own check.
            emit({ type: "tool", turn, name: tool.name, input, ms: round(performance.now() - started), ok: true, outputChars: out.length, truncated: /\[truncated/.test(out) });
            return out;
          } catch (err) {
            emit({ type: "tool", turn, name: tool.name, input, ms: round(performance.now() - started), ok: false, outputChars: 0, truncated: false, error: String(err instanceof Error ? err.message : err) });
            throw err;
          }
        },
      }));
    },
  };
}

/** Append each event to a JSONL file, with a timestamp. */
export const jsonlSink = (file: string): Emit => (event) => fs.appendFileSync(file, JSON.stringify({ t: new Date().toISOString(), ...event }) + "\n");

export const readTrace = (file: string): TraceEvent[] =>
  fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as TraceEvent);

export function summarizeTrace(events: TraceEvent[], model: string) {
  const models = events.filter((e): e is Extract<TraceEvent, { type: "model" }> => e.type === "model");
  const tools = events.filter((e): e is Extract<TraceEvent, { type: "tool" }> => e.type === "tool");

  const usage = models.reduce(
    (s, m) => ({ input: s.input + m.usage.input, output: s.output + m.usage.output, cacheRead: s.cacheRead + m.usage.cacheRead, cacheWrite: s.cacheWrite + m.usage.cacheWrite }),
    { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  );

  // estTokens: roughly how many tokens this tool's results put into the context (about 4 characters per token).
  // ponytail: a chars/4 estimate; call countTokens on the result text when you need the exact number.
  const byTool: Record<string, { count: number; totalMs: number; errors: number; estTokens: number }> = {};
  for (const t of tools) {
    const s = (byTool[t.name] ??= { count: 0, totalMs: 0, errors: 0, estTokens: 0 });
    s.count++;
    s.totalMs += t.ms;
    s.estTokens += Math.ceil(t.outputChars / 4);
    if (!t.ok) s.errors++;
  }

  return {
    turns: models.length,
    toolCalls: tools.length,
    usage,
    // Prices every cache write at the 5-minute rate. A run that uses 1-hour caching costs more than this says.
    costUsd: costUsd(model, { input: usage.input, output: usage.output, cacheRead: usage.cacheRead, cacheWrite5m: usage.cacheWrite }),
    modelMs: round(models.reduce((s, m) => s + m.ms, 0)),
    toolMs: round(tools.reduce((s, t) => s + t.ms, 0)),
    byTool,
    slowestTool: tools.reduce<{ name: string; ms: number } | undefined>((best, t) => (!best || t.ms > best.ms ? { name: t.name, ms: t.ms } : best), undefined),
  };
}
