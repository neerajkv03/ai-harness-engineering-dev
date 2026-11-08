# Level 1 — Using a Harness

Icon: `Terminal` · 4 lessons · Examples: `examples/level-1/`

Goal: learner runs Pi daily on real work, writes a useful `AGENTS.md`, and has a reliable verify-before-accept habit.

---

## 1.1 Landscape (2026)

Description: "Same models, different harnesses. The harness is why one agent beats another."

| # | Block | Content |
|---|---|---|
| 1 | section | Harness defined: everything except the model — system prompt, tools, context management, permissions, UI. Callback to the Level 0 loop: a harness is that loop, productionized. |
| 2 | table | Harness comparison: Claude Code, Codex CLI, Gemini CLI, Amp, Cursor, Droid, Pi — open/closed source, extension model, default tools, MCP support. |
| 3 | section | Open vs closed; what "minimal" buys you (Pi: 4 core tools, readable source, extend in TS). |
| 4 | example | LangChain moved from 30th to 5th on Terminal-Bench 2.0 by changing only the harness. Tag: Benchmark. |
| 5 | section | Benchmarks as scoreboards: SWE-bench (fix real GitHub issues), Terminal-Bench 2.0 (terminal tasks). What they measure, and what they don't. |
| 6 | note (info) | Leaderboards change monthly. Read the harness + model pair, not just the model name. |
| 7 | section | Further reading |

Sources:
- [SWE-bench](https://www.swebench.com/) (verify)
- [Terminal-Bench](https://www.tbench.ai/) (verify)
- [Faros — Harness engineering guide](https://www.faros.ai/blog/harness-engineering)
- [arXiv 2609.00006 — Source-code study of eleven harnesses](https://arxiv.org/pdf/2609.00006)

---

## 1.2 Pi: install and first session

Description: "Install a minimal harness and read what it actually does."

| # | Block | Content |
|---|---|---|
| 1 | steps | `npm i -g @earendil-works/pi-coding-agent` (verify; older scope `@mariozechner`) → set provider key → run `pi` in a test repo → `/model` to choose model. |
| 2 | note (warning) | Two npm scopes exist after the 2026 handover. Install only the official one; check the publisher on npm. |
| 3 | section | Config layout: `~/.pi/agent/` (global) vs `.pi/` (project overrides). Same idea as global vs local `.npmrc`. |
| 4 | table | Core tools: `read`, `bash`, `edit`, `write`; opt-in `grep`, `find`, `ls` — what each does, when the model reaches for it. |
| 5 | section | First task walkthrough: "explain this repo", then a tiny edit. Read every tool call in the TUI. |
| 6 | table | Keybindings and slash commands: `/model`, `/tree` (Esc Esc), others (verify list from docs). |
| 7 | example | Pi's tool list fits on one screen. Compare: some harnesses ship 30+ tools. Fewer tools = less context spent, fewer wrong choices. Tag: Design. |
| 8 | section | Further reading |

Sources:
- [pi.dev docs](https://pi.dev/docs/latest) (verify)
- [Pi repo](https://github.com/earendil-works/pi)
- [pi.dev deep dive](https://urandom.io/blog/2026-03-07-pi-dev-deep-dive)
- [Pi sandbox analysis](https://agent-safehouse.dev/docs/agent-investigations/pi)

---

## 1.3 Project instruction files

Description: "`AGENTS.md` is the README for your agent. Short, specific, true."

| # | Block | Content |
|---|---|---|
| 1 | section | What it is: a file auto-loaded into the system prompt. Pi reads `AGENTS.md` (verify which names Pi loads); Claude Code reads `CLAUDE.md`. |
| 2 | table | Belongs / doesn't belong: commands (yes), architecture spanning many files (yes), constraints (yes), generic advice (no), file listings (no), secrets (never). |
| 3 | code | `AGENTS.md` sample for a MERN repo — commands, folder roles, "never edit `/generated`". Language: markdown. |
| 4 | section | Hierarchy: global → project → directory. Closer file wins on conflict. |
| 5 | note (warning) | Rule files are suggestions. The model follows them most of the time, not always. Hard rules need hooks (Level 4). |
| 6 | example | This repo's own `CLAUDE.md` as a worked example: what it says and why each line is there. Tag: Real repo. |
| 7 | section | Further reading |

Sources:
- [agents.md](https://agents.md/) (verify)
- [Augment Code — Harness engineering guide](https://www.augmentcode.com/guides/harness-engineering-ai-coding-agents)
- [arXiv 2602.14690 — Harness engineering in OSS repos](https://arxiv.org/html/2602.14690v5)

---

## 1.4 Working effectively with an agent

Description: "Your job shifts from typing code to specifying and verifying it."

| # | Block | Content |
|---|---|---|
| 1 | section | Task decomposition: one clear goal per session. "Add pagination to `/users`", not "improve the API". |
| 2 | table | Bad prompt → better prompt, 4 pairs (vague → specific, no check → with check, too big → split, implicit → explicit file names). |
| 3 | section | Verification habit: tell the agent to run the test/build and show output. Read the output yourself. |
| 4 | note (danger) | "Done" from an agent is a claim, not evidence. Check the test output. |
| 5 | section | Reading diffs: `git diff` before accepting; look for deleted tests, widened types, `any`, commented-out code. |
| 6 | section | Fresh vs continue: start fresh when the context is full of dead ends; continue when state matters. |
| 7 | example | Code review of a junior's PR: same checklist applies to agent output. Tag: Team. |
| 8 | section | Further reading |

Sources:
- Anthropic, "Claude Code best practices" (verify URL)
- Simon Willison, writing on agentic coding (verify specific post)

---

## Curriculum fixes

None.
