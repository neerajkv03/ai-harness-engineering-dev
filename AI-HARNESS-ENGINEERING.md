# AI Harness Engineering — Learning Path (Scratch → Advanced)

Harness = everything around the model that turns it into a dependable agent: system prompt, tools, context management, permissions, memory, orchestration, evals. The model is the engine; the harness is the car. Same model, better harness, better results (LangChain moved from outside the Top 30 to the Top 5 on Terminal-Bench 2.0 by changing only the harness).

Pi (pi.dev) is used as the reference harness throughout because it is minimal, readable, and built to be extended rather than configured.

---

## Level 0 — Foundations

### 0.1 How LLMs work (just enough)
- Tokens, context window, attention cost (quadratic), KV cache
- Sampling then and now: temperature/top-p removed on current Claude; effort + thinking replace them; stop sequences remain
- Instruction following is probabilistic, not guaranteed
- Model families and tiers (frontier vs. small/fast), when each fits

### 0.2 Tool calling / function calling
- JSON-schema tool definitions
- Tool call → tool result → model continues (the basic loop)
- Parallel tool calls; tool choice: auto / none (forced choice removed on newest models, use strict schemas or structured outputs)
- Structured outputs vs. tool calls

### 0.3 The agent loop
- Observe → think → act → observe
- Termination conditions (no more tool calls, max turns, budget)
- Streaming and partial output handling
- Error paths: tool failure, malformed call, model refusal

### 0.4 Developer prerequisites
- TypeScript/Node or Bun fluency (Pi is TypeScript)
- Git, shell, Unix tooling (`grep`, `find`, `sed`, pipes)
- Basic HTTP/API knowledge; reading OpenAPI specs
- Writing and running tests

---

## Level 1 — Using a Harness

### 1.1 Landscape (2026)
- Claude Code, Codex CLI, Gemini CLI, Amp, Cursor, Droid, Pi
- Open vs. closed harnesses; what "minimal" buys you
- Terminal-Bench (2.0, now 4.0) and SWE-bench as harness scoreboards

### 1.2 Pi: install and first session
- `npm i -g @earendil-works/pi-coding-agent` (older scope: `@mariozechner`)
- Provider setup: API keys, model selection, `/model`
- Config layout: `~/.pi/agent/` (global) vs. `.pi/` (project overrides)
- Core tools: `read`, `bash`, `edit`, `write`; opt-in `grep`, `find`, `ls`
- Keybindings, `/tree` (Esc Esc), slash commands

### 1.3 Project instruction files
- `AGENTS.md` / `CLAUDE.md`: what belongs, what doesn't
- Commands, architecture, constraints; never generic advice
- Instruction hierarchy: global → project → directory
- Limits: rule files are suggestions to the model; enforcement needs code

### 1.4 Working effectively with an agent
- Task decomposition: one clear goal per session
- Verification habit: make the agent run the check, read the output
- Reading diffs before accepting
- When to start fresh vs. continue

---

## Level 2 — Context Engineering

### 2.1 What goes in the window
- System prompt anatomy: identity, tools, rules, environment, repo context
- Just-in-time retrieval vs. preloading everything
- Progressive disclosure (skills load on demand, not upfront)
- Token budgeting per section

### 2.2 Context rot and compaction
- Why long contexts degrade (lost-in-the-middle, stale state)
- Summarization-based compaction: what to keep (goals, decisions, open threads)
- Context editing (clearing old tool results) vs compaction (summarizing); on-demand vs token-threshold compaction
- Pi: session compaction, how summaries are generated and injected
- Checkpoints and resumable state

### 2.3 Session trees and branching
- Pi `/tree`: branch a session, explore, discard, return
- Forking context for parallel attempts
- Cherry-picking results back into the main line

### 2.4 Memory
- Short-term (in-window), medium (session files), long-term (persistent notes)
- File-based memory: one fact per file, index file, recall at startup
- Memory hygiene: dedupe, expire, verify before trusting

### 2.5 Prompt templates
- Pi prompt templates (`~/.pi/agent/prompts/`), parameterized slash commands
- Reusable task recipes: review, refactor, write tests, plan
- Template vs. skill: when a prompt is enough

---

## Level 3 — Tools and Skills

### 3.1 Tool design
- Few, orthogonal, well-described tools beat many (Vercel cut 80% of tools, got better results)
- Input schemas: tight types, defaults, examples in descriptions
- Output design: concise, structured, truncated with pointers
- Idempotency and dry-run modes for dangerous tools

### 3.2 Writing custom tools in Pi
- Extension API: register a tool with schema + handler
- Tool result formatting for the model vs. for the TUI
- Testing tools in isolation before wiring to the agent

### 3.3 Agent Skills standard
- `SKILL.md` format: frontmatter (name, description), body, `references/`
- Portable across Pi, Claude Code, Codex CLI, Amp, Droid
- Discovery: description is the trigger; body is the procedure
- Skill vs. tool vs. prompt template: decision rules

### 3.4 MCP (Model Context Protocol)
- Servers, tools, resources, prompts; stdio vs. HTTP transports
- Pi connects to MCP servers natively (`mcp.json`, `pi mcp add`); exposure modes (codemode, deferred, direct, hidden) control context cost
- Cost: every MCP tool's schema lives in the context window; tool search / deferred loading as the mitigation
- Security: untrusted servers, tool poisoning, output as data not instructions

### 3.5 Pi packages
- Bundle extensions + skills + prompts + themes
- `pi install <npm-or-git>`; project vs. global installs
- Versioning and sharing a team config

---

## Level 4 — Control: Hooks, Permissions, Safety

### 4.1 Lifecycle events
- Pi extension events: before tool call, after tool call, session start, turn end, etc.
- Hooks as deterministic enforcement (vs. rule files as suggestions)
- Common hooks: block destructive commands, auto-format, inject context, audit log

### 4.2 Permission models
- Allow / ask / deny per tool and per pattern
- Pi "trusts you": where it draws the line and how to add gates
- Trust boundaries: tool output, fetched web content, pasted text are data

### 4.3 Sandboxing
- Filesystem and network isolation (containers, VMs, OS sandboxes)
- Git worktrees for isolation of parallel work
- Secrets handling: env injection, never in context, never in commits

### 4.4 Prompt injection and agent security
- Indirect injection via files, web pages, tool outputs, MCP servers
- The lethal trifecta: private data + untrusted content + external communication; remove one leg
- Mitigations: least privilege, human confirmation for outward-facing actions, output sanitization
- Supply chain: skills, extensions, packages from third parties

### 4.5 Custom UI and commands in Pi
- Custom slash commands, keyboard shortcuts
- TUI components for confirmations, pickers, status
- Themes (`theme.json`)

---

## Level 5 — Orchestration

### 5.1 Subagents
- Why: context isolation, parallelism, specialization
- Pi: subagents via the official subagent extension (separate pi processes; agents defined as Markdown with tools and model)
- Briefing a subagent: goal, scope, what's ruled out, where to look
- Cost/accuracy tradeoff; when not to spawn

### 5.2 Multi-agent patterns
- Planner → implementer → reviewer
- Fan-out / fan-in (parallel investigation, merge findings)
- Pipeline with verification gates between stages
- Shared state: files, git, message passing

### 5.3 Long-running agents
- Anthropic's long-running harness designs (Nov 2025, Mar 2026): initializer + incremental coding agent, feature list with a `passes` flag, progress file, re-entry prompts, context resets vs compaction
- Surviving context resets: externalize state, make every turn resumable
- Heartbeats, wakeups, scheduled runs
- Detecting and breaking loops: tool-call hashing, turn caps, budgets (task budgets are advisory)

### 5.4 Headless and SDK use
- Pi SDK (`@earendil-works/pi-coding-agent`): embed the agent in Node/Bun
- Programmatic sessions, tools, models, resources
- CI integration: agent runs on PRs, gated by tests and lint
- Print, JSON and RPC modes; chat bridges (pi-chat: Discord/Telegram) and other non-terminal frontends

---

## Level 6 — Evaluation and Observability

### 6.1 Measuring a harness
- Task suites: SWE-bench, Terminal-Bench (now 4.0), internal golden tasks
- Metrics: pass rate, cost per task, tokens per task, turns per task, time
- Ablations: change one harness component, hold model fixed

### 6.2 Tracing and logs
- Full transcript capture: prompts, tool calls, results, timings
- Session replay for debugging
- Token accounting per turn and per tool

### 6.3 Failure analysis
- Taxonomy: wrong tool, bad context, lost goal, premature stop, loop, hallucinated API
- Root-causing from traces; fixing the harness, not the prompt wording
- Regression suite from past failures

### 6.4 Cost engineering
- Prompt caching: stable prefixes, cache TTLs, ordering
- Model routing: cheap model for triage, frontier for hard steps
- Effort as the first quality lever, before model routing
- Compaction and tool-output truncation as cost levers

---

## Level 7 — Advanced and Research Frontier

### 7.1 Harness architecture (source-level)
- Reading production harnesses: Pi, Claude Code, Codex CLI, Gemini CLI
- Common anatomy: loop, tool registry, context manager, permission layer, UI, extension system
- Harness as platform: plugins, marketplaces, package ecosystems

### 7.2 Self-improving harnesses
- Observability-driven harness evolution (auto-tuning prompts/tools from traces)
- Harness-R1 style: learning harness edits from failure trajectories
- Guardrails for automated changes to the harness itself

### 7.3 Computer use and browser agents
- Screenshot + action loops; accessibility-tree-based control
- Hybrid: CLI tools where possible, GUI only when required

### 7.4 Deterministic workflows around agents
- Scripted orchestration: code decides structure, agents fill steps
- Typed outputs (schemas) between stages
- Resumable runs with cached step results

### 7.5 Building your own minimal harness
- Capstone: loop + 4 tools + system prompt + compaction in <1000 lines
- Add: hooks, one skill, one subagent, tracing
- Benchmark against Pi on a small task suite; write up what mattered

---

## Suggested Order

1. Level 0 → 1 (one week): run Pi daily on real work.
2. Level 2 → 3 (two to three weeks): write an `AGENTS.md`, one skill, one custom tool, one package.
3. Level 4 (one week): add hooks that block something dangerous; sandbox a session.
4. Level 5 → 6 (two to three weeks): subagent pipeline, trace it, measure it.
5. Level 7 (ongoing): build the capstone harness; read one production harness's source end to end.
