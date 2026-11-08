// Summarize a Pi session file. Pi stores every session as JSONL, so it is already a trace you can analyze.
// Location: ~/.pi/agent/sessions/--<path>--/<timestamp>_<session-id>.jsonl (see Pi's "Session File Format" doc).

type Json = Record<string, unknown>;

export type PiSessionSummary = {
  entries: number;
  userMessages: number;
  assistantMessages: number;
  toolCalls: Record<string, number>;
  toolErrors: { tool: string; callId: string }[];
  models: string[];
  usage: { input: number; output: number; cacheRead: number; cacheWrite: number; totalTokens: number };
  costUsd: number;
  stopReasons: Record<string, number>;
  compactions: number;
};

const num = (v: unknown): number => (typeof v === "number" ? v : 0);

export function summarizePiSession(jsonl: string): PiSessionSummary {
  const s: PiSessionSummary = {
    entries: 0, userMessages: 0, assistantMessages: 0, toolCalls: {}, toolErrors: [], models: [],
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0 }, costUsd: 0, stopReasons: {}, compactions: 0,
  };
  const models = new Set<string>();

  for (const line of jsonl.split("\n")) {
    if (!line.trim()) continue;
    const entry = JSON.parse(line) as Json;
    if (entry.type === "session") continue; // the header line is metadata, not part of the conversation tree
    s.entries++;
    if (entry.type === "compaction") s.compactions++;
    if (entry.type !== "message") continue;

    const m = entry.message as Json;
    if (m.role === "user") s.userMessages++;

    if (m.role === "assistant") {
      s.assistantMessages++;
      if (typeof m.model === "string") models.add(m.model);
      const stop = String(m.stopReason ?? "unknown");
      s.stopReasons[stop] = (s.stopReasons[stop] ?? 0) + 1;
      const u = (m.usage ?? {}) as Json;
      s.usage.input += num(u.input);
      s.usage.output += num(u.output);
      s.usage.cacheRead += num(u.cacheRead);
      s.usage.cacheWrite += num(u.cacheWrite);
      s.usage.totalTokens += num(u.totalTokens);
      s.costUsd += num(((u.cost ?? {}) as Json).total);
      for (const block of (m.content as Json[]) ?? []) {
        if (block.type === "toolCall") s.toolCalls[String(block.name)] = (s.toolCalls[String(block.name)] ?? 0) + 1;
      }
    }

    if (m.role === "toolResult" && m.isError === true) s.toolErrors.push({ tool: String(m.toolName), callId: String(m.toolCallId) });
  }

  s.models = [...models];
  s.costUsd = Math.round(s.costUsd * 1e6) / 1e6;
  return s;
}
