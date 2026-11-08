// MILESTONE 4: compaction. When the history gets big, summarize the OLD part and keep the RECENT tail word for word.
// The study's recommendation: compact at a fixed buffer below the limit, keep a verbatim recent tail,
// and merge new summaries into the previous one instead of re-summarizing from scratch.
import type Anthropic from "@anthropic-ai/sdk";
import type { Caller, Message } from "./types.ts";

export const SUMMARY_MARKER = "[Summary of the earlier conversation]";

/** A rough size estimate (about 4 characters per token). Good enough to decide WHEN, not to bill by. */
export const estimateTokens = (messages: Message[]): number => Math.ceil(JSON.stringify(messages).length / 4);

const isSummary = (m: Message | undefined) => m?.role === "user" && typeof m.content === "string" && m.content.startsWith(SUMMARY_MARKER);

/** A safe place to cut: the start of a real user turn. Never between a tool call and its result. */
function findCut(messages: Message[], keepRecent: number): number {
  for (let i = Math.max(1, messages.length - keepRecent); i < messages.length; i++) {
    const m = messages[i]!;
    const startsUserTurn = m.role === "user" && (typeof m.content === "string" || !m.content.some((b) => b.type === "tool_result"));
    if (startsUserTurn) return i;
  }
  return -1;
}

const textOf = (m: Anthropic.Message) => m.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");

export async function compactIfNeeded(opts: { messages: Message[]; call: Caller; thresholdTokens: number; keepRecent?: number }): Promise<Message[]> {
  const { messages, call, thresholdTokens, keepRecent = 6 } = opts;
  if (estimateTokens(messages) <= thresholdTokens) return messages;

  const cut = findCut(messages, keepRecent);
  if (cut < 0) return messages; // no safe place to cut yet: leave it alone rather than corrupt the conversation

  const previous = isSummary(messages[0]) ? (messages[0]!.content as string).slice(SUMMARY_MARKER.length).trim() : "";
  const old = previous ? messages.slice(2, cut) : messages.slice(0, cut); // skip the summary and its acknowledgement
  const transcript = old.map((m) => `${m.role.toUpperCase()}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`).join("\n\n");

  const res = await call({
    system: "You compress a coding session so work can continue from the summary alone.",
    messages: [{
      role: "user",
      content:
        (previous ? `Here is the summary so far:\n${previous}\n\nMerge what happened since into it, keeping every earlier decision.\n\n` : "") +
        `Use exactly these headings: Goal, Decisions, Progress, Open threads, Files touched. Keep names, paths and decisions.\n\nNew conversation to include:\n${transcript}`,
    }],
    tools: [],
  });

  return [
    { role: "user", content: `${SUMMARY_MARKER}\n${textOf(res)}` },
    { role: "assistant", content: "Understood. I will continue from this summary." },
    ...messages.slice(cut), // the recent tail, untouched
  ];
}
