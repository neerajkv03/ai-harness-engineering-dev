# Level 2 — Context Engineering

Icon: `Layers` · 5 lessons · Examples: `examples/level-2/`

Goal: learner can decide what goes into the context window, keep long sessions healthy with compaction, branch sessions, build file-based memory, and write reusable prompt templates.

---

## 2.1 What goes in the window

Description: "Every token in the window competes for the model's attention. Spend them deliberately."

| # | Block | Content |
|---|---|---|
| 1 | section | Context = system prompt + tool definitions + history + tool results. All of it is resent every turn. |
| 2 | table | System prompt anatomy: identity, tools, rules, environment, repo context — purpose and typical size of each. |
| 3 | code | `01-inspect-context.ts` — build a request, call `countTokens` per section (system / tools / messages) and print a budget table. |
| 4 | section | Just-in-time retrieval vs preloading: give the agent `grep`/`read` instead of pasting the whole repo. Like lazy-loading routes in React. |
| 5 | section | Progressive disclosure: skills show a one-line description up front; the body loads only when needed. |
| 6 | note (tip) | Tool definitions count every turn. Ten unused tools are a tax on every request. |
| 7 | section | Further reading |

Sources:
- Anthropic, "Effective context engineering for AI agents" (verify URL)
- [Token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting.md)
- [Faros — Harness engineering guide](https://www.faros.ai/blog/harness-engineering)

---

## 2.2 Context rot and compaction

Description: "Long sessions get worse before they hit the limit. Compaction resets the slope."

| # | Block | Content |
|---|---|---|
| 1 | section | Context rot: stale file contents, abandoned plans, and noise dilute attention long before the window is full. |
| 2 | section | Summarization-based compaction: replace old turns with a summary. What to keep: goal, decisions, open threads, file paths touched. |
| 3 | code | `02-manual-compaction.ts` — when history passes N tokens, ask the model to summarize, then restart history from that summary. |
| 4 | section | Server-side compaction: Claude API beta (`compact-2026-01-12`, `context_management.edits: [{ type: "compact_20260112" }]`). |
| 5 | code | `03-server-compaction.ts` — multi-turn chat with server compaction; append full `response.content`, not just text. |
| 6 | note (danger) | Appending only the text drops the compaction block and silently loses compaction state. |
| 7 | section | Context editing (different from compaction): clear old tool results (`clear_tool_uses_20250919`). |
| 8 | section | Pi compaction: when it triggers, what the summary contains, how to trigger it manually (verify against Pi docs). |
| 9 | section | Checkpoints: write progress to a file so any session can resume. |
| 10 | section | Further reading |

Sources:
- [Compaction](https://platform.claude.com/docs/en/build-with-claude/compaction.md)
- [Context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing.md)
- Pi docs: compaction page (verify)
- Chroma research, "Context Rot" (verify URL)

---

## 2.3 Session trees and branching

Description: "Try three approaches without polluting one conversation."

| # | Block | Content |
|---|---|---|
| 1 | section | Why branch: exploring alternatives in one linear history leaves dead ends in context. |
| 2 | steps | Pi `/tree` (Esc Esc): view the session tree → pick a node → branch → explore → return (verify exact flow). |
| 3 | section | Forking context: same prefix, different continuations. Like `git branch` for conversations. |
| 4 | code | `04-fork-history.ts` — clone a `MessageParam[]` at turn N, run two continuations, compare outputs. |
| 5 | section | Bringing results back: copy the winning diff or summary into the main line, not the whole branch. |
| 6 | note (tip) | A shared prefix also means a shared prompt-cache hit on every branch. |
| 7 | example | Git branches: experiment on a branch, merge the winner, delete the rest. Tag: Git. |
| 8 | section | Further reading |

Sources:
- Pi docs: sessions and `/tree` (verify)
- [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching.md)

---

## 2.4 Memory

Description: "The model forgets. Your harness remembers on its behalf."

| # | Block | Content |
|---|---|---|
| 1 | table | Memory tiers: short-term (in-window), medium (session files), long-term (persistent notes) — where each lives, lifetime, cost. |
| 2 | section | File-based memory pattern: one fact per file, an index file loaded at startup, recall on demand. |
| 3 | code | `05-file-memory.ts` — `remember` / `recall` tools over a `memory/` folder with an `INDEX.md`. |
| 4 | section | Claude memory tool (`memory_20250818`) as the API-native version of the same idea. |
| 5 | section | Hygiene: dedupe, expire, verify a memory before acting on it (a remembered file path may no longer exist). |
| 6 | note (warning) | Memories can be wrong or stale. Treat them as hints, not facts. |
| 7 | example | Team wiki vs Slack: wiki = curated long-term memory, Slack = noisy short-term memory. Tag: Team. |
| 8 | section | Further reading |

Sources:
- [Memory tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool.md)
- Anthropic, "Effective context engineering for AI agents" (verify URL)

---

## 2.5 Prompt templates

Description: "Save the prompts you type every day as one-word commands."

| # | Block | Content |
|---|---|---|
| 1 | section | Prompt template = parameterized prompt saved as a slash command. Pi: `~/.pi/agent/prompts/` (global) and project equivalent (verify). |
| 2 | code | `review.md` template — code-review checklist with an argument placeholder (verify Pi's placeholder syntax). Language: markdown. |
| 3 | table | Starter templates: review, refactor, write-tests, plan — purpose and key instructions. |
| 4 | section | Template vs skill: a template is one prompt; a skill bundles a procedure plus files and loads on demand (Level 3). |
| 5 | note (tip) | If you've typed the same instruction three times, make it a template. |
| 6 | section | Further reading |

Sources:
- Pi docs: prompt templates (verify)
- [DeepWiki — Pi skills and prompt templates](https://deepwiki.com/badlogic/pi-mono/4.8-skills-and-prompt-templates)

---

## Curriculum fixes

- 2.2: add "Context editing (clearing old tool results) vs compaction (summarizing)."

---

## As built (deviations from this plan)

- **Compaction now has two modes.** Claude's docs recommend on-demand compaction (`compact-2026-09-04`, top-level `compaction` param) over threshold compaction (`compact-2026-01-12`). 2.2 teaches both: `03-on-demand-compaction.ts` and `04-threshold-compaction.ts`.
- **Examples renumbered:** `01-inspect-context`, `02-manual-compaction`, `03-on-demand-compaction`, `04-threshold-compaction`, `05-fork-history`, `06-file-memory`, `07-memory-tool` (new: the SDK's `betaMemoryTool` helper), `08-review-prompt-template.md`.
- **Context editing** is a short config snippet in the lesson (`filename: "snippet"`), not a runnable file.
- **Pi facts verified against Pi's docs:** `/tree` opens on double Escape with an empty editor (`doubleEscapeAction`, default `tree`); compaction triggers at `contextTokens > contextWindow - reserveTokens` (default 16384), keeps ~20000 recent tokens; `/tree`, `/fork`, `/clone` differ as in the table; prompt templates use `${1:-default}`-style substitutions.
- **Source URLs verified:** Anthropic "Effective context engineering" and Chroma "Context Rot" both resolve; claims quoted from them (finite attention budget, context rot, JIT retrieval, 18 LLMs tested) match the text.
- Demo output folders (`memory-demo/`, `memory-demo-api/`) are gitignored.
