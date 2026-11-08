# Level 5 — Orchestration

Icon: `Network` · 4 lessons · Examples: `examples/level-5/`

Goal: learner delegates to subagents, composes multi-agent patterns, runs long tasks that survive context resets, and embeds an agent via SDK and CI.

---

## 5.1 Subagents

Description: "A subagent is a fresh context with a narrow job."

| # | Block | Content |
|---|---|---|
| 1 | section | Why: context isolation (raw file dumps stay out of the main thread), parallelism, specialization (cheaper model, fewer tools). |
| 2 | code | `01-subagent.ts` — main loop exposes a `delegate(task)` tool; the handler runs a separate agent loop with its own history and returns only a summary. |
| 3 | section | Pi subagents via extensions: roles, tools, and model per agent (verify available examples). |
| 4 | steps | Brief a subagent: goal → scope → what's ruled out → where to look → expected output format. |
| 5 | note (warning) | The subagent knows only what you put in the brief. A thin brief returns a confident wrong answer. |
| 6 | section | Cost/accuracy: each subagent re-reads context and costs tokens. Don't spawn for a two-line lookup. |
| 7 | example | Delegating to a contractor: a clear SOW gets good work; "fix the site" gets an invoice. Tag: Team. |
| 8 | section | Further reading |

Sources:
- Anthropic, "How we built our multi-agent research system" (verify URL)
- [kcosr/pi-extensions](https://github.com/kcosr/pi-extensions) (subagent examples, verify)

---

## 5.2 Multi-agent patterns

Description: "Three shapes cover most multi-agent systems."

| # | Block | Content |
|---|---|---|
| 1 | table | Patterns: planner → implementer → reviewer; fan-out / fan-in; pipeline with gates — shape, when to use, failure mode. |
| 2 | code | `02-fan-out.ts` — investigate 3 folders in parallel with `Promise.all`, merge findings with one final call. |
| 3 | code | `03-pipeline-gate.ts` — implementer writes code → gate runs `bun test` → reviewer only if tests pass. |
| 4 | section | Shared state: files, git commits, message passing. Prefer files + git (inspectable, resumable). |
| 5 | note (tip) | Put a deterministic check (tests, lint, schema) between agents. Agents grading agents compounds errors. |
| 6 | example | CI pipeline stages: build → test → deploy, each gate blocks the next. Tag: DevOps. |
| 7 | section | Further reading |

Sources:
- Anthropic, "Building effective agents" (verify URL)
- [Marmelab — State of harness engineering 2026](https://marmelab.com/blog/2026/09/24/the-state-of-ai-harness-engineering-2026.html)

---

## 5.3 Long-running agents

Description: "A task longer than one context window needs state outside the window."

| # | Block | Content |
|---|---|---|
| 1 | section | The problem: context resets mid-task lose the plan unless it lives outside the model. |
| 2 | section | Anthropic's long-running harness design (March 2026): checkpoints, progress files, re-entry prompts (verify details from the post). |
| 3 | code | `04-progress-file.ts` — agent reads `PROGRESS.md` at start, updates it after each step, can be killed and restarted. |
| 4 | section | Heartbeats, wakeups, scheduled runs: cron, queue workers, scheduled cloud agents. |
| 5 | section | Loop detection: same tool + same args N times → stop and escalate. |
| 6 | code | `05-loop-guard.ts` — hash recent tool calls, abort on repeats. |
| 7 | note (danger) | A long-running agent without a budget or loop guard is a runaway cost. |
| 8 | section | Further reading |

Sources:
- Anthropic, "Effective harnesses for long-running agents" (verify URL)
- Anthropic, "Harness design for long-running application development" (March 2026, verify URL)
- [Task budgets](https://platform.claude.com/docs/en/build-with-claude/task-budgets.md)

---

## 5.4 Headless and SDK use

Description: "The harness without the terminal: run agents from code, CI, and chat."

| # | Block | Content |
|---|---|---|
| 1 | section | Pi SDK: embed the agent in Node/Bun (`@earendil-works/pi-coding-agent`). Sessions, tools, models, resources. |
| 2 | code | `06-pi-sdk.ts` — create a session, send a task, stream events, print the final result (verify API from `docs/sdk.md`). |
| 3 | section | CI integration: agent runs on a PR, gated by tests and lint, posts a comment. |
| 4 | code | `.github/workflows/agent-review.yml` — run the SDK script on `pull_request` with the key from secrets. Language: yaml. |
| 5 | note (danger) | Never run an agent with write access on PRs from forks. Untrusted code + secrets = leak. |
| 6 | section | Other frontends: Slack bot (Pi's `mom` package, verify), web UI, cron jobs. |
| 7 | section | Further reading |

Sources:
- [Pi SDK docs](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/sdk.md)
- [GitHub Actions — security hardening](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions) (verify)

---

## Curriculum fixes

- 5.3: add "Loop detection with tool-call hashing."

---

## As built (deviations from this plan)

- **A shared, tested library** (`examples/level-5/lib/`): `agent.ts` (capped loop with an injected model call, plus `delegateTool`), `tools.ts` (folder-confined file tools), `patterns.ts` (`fanOutFanIn`, `runPipeline`, `runGate`), `progress.ts` (feature list, progress log, re-entry prompt, `runFeatures`), `loop-guard.ts`, `fake-model.ts` (scripted stand-in for Claude), `demo-workspace.ts`. Because the model call is injected, the orchestration logic has 22 offline tests that need no API key.
- **Examples:** `01-subagent.ts`, `02-fan-out.ts`, `03-pipeline-gate.ts`, `04-progress-file.ts`, `05-loop-guard.ts` (runs offline), `06-pi-sdk.ts`, `07-agent-review.yml`, `08-pi-agent-definition.md` (Pi agent file format).
- **Plan corrections:** Pi's chat bridge is now `earendil-works/pi-chat` (Discord and Telegram), not a `mom` Slack package. Claude task budgets are advisory, not enforced. In GitHub Actions, fork PRs get no secrets and a read-only token, and `pull_request_target` with an untrusted checkout is the dangerous combination, so "never run an agent with write access on fork PRs" became a concrete workflow design.
- **Long-running patterns are sourced to Anthropic's two posts:** "Effective harnesses for long-running agents" (Nov 2025: initializer + coding agent, JSON feature list with a `passes` field, progress file, clean state) and "Harness design for long-running application development" (Mar 2026: planner/generator/evaluator, context resets vs compaction). The "context anxiety" finding is attributed to Claude Sonnet 4.5 as the post states, and the lesson says to measure on your own model.
- **Multi-agent numbers** (90.2% over single-agent Opus 4 on Anthropic's internal research eval, ~4x and ~15x token usage, 80% of BrowseComp variance explained by token usage) are quoted from Anthropic's multi-agent research post with attribution.
- **Verified:** 22 library tests pass under `node --test` and `bun test`; examples type-check strictly; the loop-guard demo ran (stops a stuck agent after 3 of 20 possible calls); the long-running glue was run end to end with a scripted model writing real files through the tool layer, the real test gate, and real progress files; the Pi SDK example type-checks against the real Pi package; every flag in the CI workflow was accepted by Pi's real CLI (a fake flag errors as "Unknown option"); the workflow YAML parses and has the intended credential split (agent step: model key only; post step: GitHub token only).
- **Bugs found while testing:** TypeScript parameter properties fail under Node's type stripping (`node file.ts`), so `LoopGuard` uses an explicit field. A nested `node --test` inherits `NODE_TEST_CONTEXT` when run under another test runner and can report a false pass, so `runGate` clears it.
- **Not verified:** `01`–`04` were not run against Claude (no API key here; they type-check and their logic is covered by the offline tests), and the workflow was not run on GitHub.
- `06-pi-sdk.ts` is excluded from `examples/tsconfig.json` (Pi supplies its imports).
