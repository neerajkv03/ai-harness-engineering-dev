# Level 7 — Advanced and Research Frontier

Icon: `FlaskConical` · 5 lessons · Examples: `examples/level-7/` + `capstone/`

Goal: learner reads production harness source, understands self-improving harnesses and computer use, builds deterministic workflows, and ships a minimal harness of their own.

---

## 7.1 Harness architecture (source-level)

Description: "Every harness is the same six parts. Learn to find them in any codebase."

| # | Block | Content |
|---|---|---|
| 1 | table | Common anatomy: loop, tool registry, context manager, permission layer, UI, extension system — and where each lives in Pi's repo (verify paths). |
| 2 | steps | Reading guide for Pi: entry point → agent loop → tool registry → session/compaction → extension loader (verify file names). |
| 3 | section | Comparing harnesses: what Claude Code, Codex CLI, Gemini CLI do differently in each part. |
| 4 | section | Harness as platform: plugins, marketplaces, package ecosystems. |
| 5 | note (tip) | Read the loop file first. Everything else hangs off it. |
| 6 | section | Further reading |

Sources:
- [arXiv 2609.00006 — Source-code study of eleven harnesses](https://arxiv.org/pdf/2609.00006)
- [Pi repo](https://github.com/earendil-works/pi)
- [Pi Mono explained](https://hoangyell.com/pi-mono-explained/)

---

## 7.2 Self-improving harnesses

Description: "Let traces suggest harness changes. Keep a human on the merge button."

| # | Block | Content |
|---|---|---|
| 1 | section | Observability-driven evolution: mine traces for failures, propose prompt/tool edits, evaluate, keep winners. |
| 2 | section | Harness-R1: learning harness edits from failure trajectories (summary of method and results). |
| 3 | code | `01-propose-fix.ts` — feed a failed trace to the model, ask for one harness change as a diff, run the golden suite on it. |
| 4 | section | Guardrails: edits go through review and the eval suite; never auto-merge harness changes. |
| 5 | note (danger) | A harness that edits its own permission rules can remove its own safety. Keep permissions out of reach. |
| 6 | section | Further reading |

Sources:
- [arXiv 2604.25850 — Agentic harness engineering](https://arxiv.org/pdf/2604.25850)
- [Harness-R1](https://arxiv.org/pdf/2608.02276)

---

## 7.3 Computer use and browser agents

Description: "When there's no API, the agent uses the screen."

| # | Block | Content |
|---|---|---|
| 1 | section | Screenshot + action loop vs accessibility-tree control. Tradeoffs: robustness, speed, cost. |
| 2 | section | Claude computer use: `computer_toolset_20260801` on current models (verify setup details). |
| 3 | code | `02-browser-agent.ts` — Playwright-driven agent using accessibility snapshots instead of screenshots (verify chosen approach). |
| 4 | section | Hybrid rule: CLI/API where possible, GUI only when required. |
| 5 | note (warning) | Screens contain untrusted text. Computer-use agents are prime prompt-injection targets (4.4). |
| 6 | example | Test automation with Playwright: same selectors problem, now with a model choosing actions. Tag: QA. |
| 7 | section | Further reading |

Sources:
- [Computer use tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool.md)
- [Playwright docs](https://playwright.dev/docs/intro)

---

## 7.4 Deterministic workflows around agents

Description: "Code decides the structure. Agents fill in the steps."

| # | Block | Content |
|---|---|---|
| 1 | section | Workflow vs agent: when the steps are known, write them in code; use the model only inside steps. |
| 2 | code | `03-typed-workflow.ts` — 3-step workflow (extract → transform → review), each step returns a Zod-validated object via structured outputs. |
| 3 | section | Typed handoffs: schemas between stages catch bad output at the boundary. |
| 4 | section | Resumable runs: cache each step's result by input hash; rerun skips finished steps. |
| 5 | code | `04-step-cache.ts` — memoize step results to disk keyed by hash. |
| 6 | note (tip) | Start with a workflow. Upgrade a step to an agent only when the step can't be specified. |
| 7 | section | Further reading |

Sources:
- Anthropic, "Building effective agents" — workflows vs agents (verify URL)
- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs.md)

---

## 7.5 Capstone: build your own minimal harness

Description: "Under 1000 lines. Then measure it against Pi."

| # | Block | Content |
|---|---|---|
| 1 | steps | Milestones: loop + 4 tools (read, write, edit, bash) → system prompt with `AGENTS.md` loading → compaction → hooks → one skill → one subagent → tracing. |
| 2 | code | `capstone/src/loop.ts` — reference loop skeleton (learner fills in the rest). |
| 3 | table | Milestone checklist: feature, acceptance check, lessons it draws from. |
| 4 | section | Benchmark: run the 6.1 golden suite on your harness and on Pi with the same model. |
| 5 | section | Write-up template: what mattered, what didn't, what you'd change. |
| 6 | note (info) | Your harness will lose to Pi at first. The point is knowing exactly why. |
| 7 | section | Further reading |

Sources:
- [Pi repo](https://github.com/earendil-works/pi)
- All earlier level sources

---

## Curriculum fixes

None.

---

## As built

Lessons in `src/data/learning/level-7.ts`; code in `examples/level-7/`. 63 Level 7 tests, all offline; full example suite 148 passing under node.

- **7.1** Uses the paper's seven subsystems (not "six parts"). Pi reading guide has verified paths. Added `lib/harness-map.ts` + `01-map-a-harness.ts` (keyword-density mapper; works on installed npm packages by skipping `dist` only when a sibling `src` exists).
- **7.2** Replaced the planned `01-propose-fix.ts` with a full guarded loop: `lib/evolution.ts` + `evolution-scenario.ts` + `02-harness-evolution.ts`. Stages: guardrail (protected files, schema, prediction), no_improvement, regression, prediction, human approval. The model is simulated, so it runs free and offline. AHE and Harness-R1 are summarized from their abstracts only.
- **7.3** Playwright aria-ref tools (`lib/browser-tools.ts`, `03-browser-agent.ts`) with a host allow-list plus a network-layer block. Anthropic's `browser_toolset_20260801` is the same design with a hosted contract. Not run against the live API.
- **7.4** `lib/workflow.ts` (typed steps, bounded retry, `StepError`, hash-keyed disk cache), `04-typed-workflow.ts --fake`, `05-step-cache-demo.ts`.
- **7.5** Capstone is 488 lines (plan target: under 1000), 9 milestones, 26 tests, one example skill (`capstone/skills/fix-failing-test/`). `bench.ts` compares with Pi using the same prompts and model, reports tokens and cost for both, and keeps every transcript; it is type-checked only.

Not verified end to end: scripts needing `ANTHROPIC_API_KEY` (`03-browser-agent`, `04-typed-workflow` without `--fake`, `capstone/cli.ts`, `bench.ts`) and the Pi side of the benchmark.
