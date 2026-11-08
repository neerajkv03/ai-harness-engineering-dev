# Level 6 — Evaluation and Observability

Icon: `ChartLine` · 4 lessons · Examples: `examples/level-6/`

Goal: learner measures a harness change, traces every turn, root-causes failures from traces, and cuts cost without losing quality.

---

## 6.1 Measuring a harness

Description: "If you didn't measure it, you didn't improve it."

| # | Block | Content |
|---|---|---|
| 1 | section | Public suites (SWE-bench, Terminal-Bench 2.0) vs your own golden tasks. Your tasks matter more. |
| 2 | code | `01-golden-tasks.ts` — 10 tasks, each a prompt + a checker function (run test, grep output). Runs the agent, prints a pass rate. |
| 3 | table | Metrics: pass rate, cost/task, tokens/task, turns/task, wall time — what each tells you. |
| 4 | section | Ablation: change one harness component, hold the model fixed, rerun the suite. |
| 5 | note (warning) | Model output varies run to run. Run each task several times before calling a change a win. |
| 6 | example | A/B test in a web app: same traffic split, one variable changed. Tag: Product. |
| 7 | section | Further reading |

Sources:
- [SWE-bench](https://www.swebench.com/) (verify)
- [Terminal-Bench](https://www.tbench.ai/) (verify)
- Anthropic, "Demystifying evals for AI agents" (verify URL)

---

## 6.2 Tracing and logs

Description: "A transcript is a stack trace for agent behavior."

| # | Block | Content |
|---|---|---|
| 1 | section | Capture: every prompt, tool call, tool result, timing, and token count per turn. |
| 2 | code | `02-trace-logger.ts` — wrap the agent loop and write JSONL per turn (`turn`, `tool`, `input`, `ms`, `usage`). |
| 3 | section | Session replay: Pi session files as replayable logs (verify format). |
| 4 | section | OpenTelemetry: Anthropic SDK spans, when it's worth setting up a backend. |
| 5 | note (tip) | Log `usage` from every response. It's free and answers "where did the money go?" |
| 6 | section | Further reading |

Sources:
- [OpenTelemetry overview (Claude)](https://platform.claude.com/docs/en/manage-claude/opentelemetry.md)
- [SDK tracing](https://platform.claude.com/docs/en/manage-claude/opentelemetry/sdk.md)

---

## 6.3 Failure analysis

Description: "Fix the harness, not the wording of one prompt."

| # | Block | Content |
|---|---|---|
| 1 | table | Failure taxonomy: wrong tool, bad context, lost goal, premature stop, loop, hallucinated API — symptom in the trace, typical harness fix. |
| 2 | steps | Root-cause from a trace: find first wrong turn → what did the model see? → what was missing or misleading? → fix the tool, context, or rule. |
| 3 | example | Walkthrough of a real-looking failed trace: the agent edits the wrong file because `read_file` truncated silently. Fix: truncation pointer (3.1). Tag: Debugging. |
| 4 | section | Regression suite: every fixed failure becomes a golden task (6.1). |
| 5 | note (warning) | Adding "IMPORTANT: don't do X" to the prompt is a patch, not a fix. Check the tool or context first. |
| 6 | section | Further reading |

Sources:
- [arXiv 2604.25850 — Observability-driven harness evolution](https://arxiv.org/pdf/2604.25850)
- [Harness-R1](https://arxiv.org/pdf/2608.02276)

---

## 6.4 Cost engineering

Description: "Cheaper per task, not just cheaper per request."

| # | Block | Content |
|---|---|---|
| 1 | section | Prompt caching: prefix match; stable system + tools first, volatile content last; `cache_control`. |
| 2 | code | `03-prompt-caching.ts` — same long system prompt twice; print `cache_creation_input_tokens` vs `cache_read_input_tokens`. |
| 3 | note (warning) | A timestamp or random ID in the system prompt silently kills every cache hit. |
| 4 | section | Effort as a lever: lower effort on the same model before switching to a cheaper model. |
| 5 | section | Model routing: cheap model for triage/subagents, top model for hard steps. Caches are per model. |
| 6 | section | Compaction and tool-output truncation as cost levers. |
| 7 | table | Lever / typical saving / quality risk: caching, effort, routing, truncation, batch API. |
| 8 | section | Further reading |

Sources:
- [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching.md)
- [Cost optimization](https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence.md)
- [Pricing](https://platform.claude.com/docs/en/about-claude/pricing.md)

---

## Curriculum fixes

- 6.4: add "Effort as the first cost lever, before model routing."

---

## As built (deviations from this plan)

- **Almost everything runs offline.** `examples/level-6/lib/` has `stats.ts` (Wilson interval, seeded permutation test, pass@k / pass^k), `eval.ts` (runner with a fresh temp folder per trial), `golden-tasks.ts` (eleven tasks with graders and reference solutions; the eleventh is the 6.3 failure as a regression task), `trace.ts` (tracer wrapping the Level 5 `Caller` and tools, JSONL sink, summarizer), `pricing.ts`, `analyze.ts` (trace analyzer), `staged-failure.ts`, `pi-session.ts` (summarizes Pi's session JSONL). 47 tests, plus `fixtures/sample-pi-session.jsonl` built to Pi's documented format.
- **Examples:** `01-golden-tasks.ts` (needs an API key; the only one that spends money besides `06`), `02-noise-demo.ts`, `03-trace-run.ts`, `04-pi-session-summary.ts`, `05-failed-trace.ts`, `06-prompt-caching.ts` (needs an API key), `07-cost-model.ts`. The plan's `01-golden-tasks.ts`, `02-trace-logger.ts` and `03-prompt-caching.ts` grew into this set.
- **The noise simulation is the centerpiece of 6.1.** With the true pass rates known, 10 trials per variant make identical harnesses look 10+ points apart 30% of the time, and detect a real 10-point gain only 1% of the time (63% even at 200 trials). Deterministic (seeded); identical under node and bun.
- **Eval design follows Anthropic's "Demystifying evals for AI agents"** (task, trial, grader, transcript, outcome; code/model/human graders; capability vs regression evals; 20-50 tasks from real failures; reference solutions; isolate trials; read the transcripts). The golden-task suite has its own test that every task fails untouched and passes with its reference solution, and that the two cheat-able graders reject cheating (editing the test; breaking behavior while deleting logs).
- **6.3 uses a staged failure with real tools:** a `read_file` that silently truncates at a size cap vs one that returns a pointer. The scripted "model" is clearly labelled; the file damage and the analyzer findings are real, and the analyzer is tested on both runs.
- **6.4 numbers are sourced:** prices from the pricing page; effort-sweep figures, the "~40% cheaper by re-running failures at higher effort", the "43% of spend in two problems", and "tune one model before adding a second" are Anthropic's cost guide, attributed and flagged as directional. The caching savings (~80% on the modelled 30-turn run) are computed by `07-cost-model.ts` under stated assumptions.
- **Verified:** all 47 tests pass under `node --test` and `bun test`; examples type-check strictly; all offline demos ran; the caching minimums (512 tokens on Opus 5.5 / Sonnet 5.5 / Haiku 5.5 / Fable 5.1), 5-minute default lifetime refreshed on use, 1-hour at 2x, and Batch's 50% off every token within 24 hours match the Claude docs.
- **Not verified:** `01-golden-tasks.ts` and `06-prompt-caching.ts` were type-checked but not run (no API key here); their logic pieces are covered by the offline tests.
- **UI fix made along the way:** the right-sidebar header now wraps long level names instead of truncating.
