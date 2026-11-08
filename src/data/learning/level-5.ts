import type { Topic } from "./types.ts";
// Code blocks import the runnable example files, so lesson code and examples/ can never drift apart.
import agentLoop from "../../../examples/level-5/lib/agent.ts?raw";
import patterns from "../../../examples/level-5/lib/patterns.ts?raw";
import progress from "../../../examples/level-5/lib/progress.ts?raw";
import loopGuard from "../../../examples/level-5/lib/loop-guard.ts?raw";
import subagent from "../../../examples/level-5/01-subagent.ts?raw";
import fanOut from "../../../examples/level-5/02-fan-out.ts?raw";
import pipelineGate from "../../../examples/level-5/03-pipeline-gate.ts?raw";
import progressFile from "../../../examples/level-5/04-progress-file.ts?raw";
import loopGuardDemo from "../../../examples/level-5/05-loop-guard.ts?raw";
import piSdk from "../../../examples/level-5/06-pi-sdk.ts?raw";
import agentReview from "../../../examples/level-5/07-agent-review.yml?raw";
import agentDefinition from "../../../examples/level-5/08-pi-agent-definition.md?raw";

export const level5: Topic = {
  slug: "orchestration",
  title: "Level 5 — Orchestration",
  icon: "Network",
  subTopics: [
    // ───────────────────────── 5.1 ─────────────────────────
    {
      slug: "subagents",
      title: "5.1 Subagents",
      description: "A subagent is a fresh context with a narrow job.",
      blocks: [
        {
          type: "section",
          title: "Why delegate",
          body: [
            "A subagent is a separate agent run with its own empty context. The main agent hands it a task, the subagent does the reading and searching, and only its final report comes back. Three reasons to do this.",
            "Isolation: the raw file dumps and dead ends stay out of the main context (Level 2's context rot). Parallelism: several subagents can work at once. Specialization: a subagent can use a cheaper model and fewer tools than the main agent.",
          ],
        },
        {
          type: "section",
          title: "The loop, reusable",
          body: [
            "Every example in this level builds on one small module: a capped agent loop (from Level 0) plus a `delegate` tool. The model call is injected, so the same code runs against Claude or, in tests, a scripted fake. That is why this level's logic has real automated tests that need no API key.",
            "`delegateTool` wraps `runAgent`. When the main agent calls it, a second loop starts with a fresh history, the helper's own tools, and only the task text. The helper's transcript is discarded and only its final text is returned.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-5/lib/agent.ts", code: agentLoop },
        {
          type: "section",
          title: "Delegate a question",
          body: [
            "The main agent here cannot read files at all. Its only tool is `delegate`, and the helper gets read-only file tools. The program prints how many tokens each side used.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-5/01-subagent.ts", code: subagent },
        {
          type: "note",
          variant: "info",
          title: "Tested, not just claimed",
          text: "A unit test has a helper read a large file, then asserts that the file's contents never appear in the main agent's transcript, and that only the helper's short report does.",
        },
        {
          type: "steps",
          title: "Brief a subagent",
          items: [
            "Goal: the single question or outcome, in one sentence.",
            "Scope: which folders or sources to use, and which to leave alone.",
            "What is already ruled out: what you know, so it does not redo it.",
            "Where to look first: names, paths or leads you already have.",
            "Output format: exactly what you want back (for example, \"at most 5 bullets, each with a file path\").",
          ],
        },
        {
          type: "note",
          variant: "warning",
          title: "Warning",
          text: "The subagent knows only what you put in the brief. A thin brief gets a confident, wrong or duplicated answer. The `delegate` tool above rejects a task shorter than 60 characters and tells the model what a full brief contains.",
        },
        {
          type: "example",
          title: "A vague brief, a wasted run",
          context: "Anthropic",
          text: "Anthropic's research team gave subagents short instructions like \"research the semiconductor shortage\". The subagents misread the task or repeated each other's searches. In one case a subagent explored the 2021 automotive chip crisis while two others duplicated work on 2025 supply chains. Their fix: each subagent needs an objective, an output format, guidance on tools and sources, and clear task boundaries.",
        },
        {
          type: "section",
          title: "What it costs",
          body: [
            "Subagents are not free. Anthropic reports that agents use about 4 times the tokens of a chat, and multi-agent systems about 15 times. In their internal research evaluation, a lead Claude Opus 4 with Claude Sonnet 4 subagents beat single-agent Claude Opus 4 by 90.2%, and token usage alone explained 80% of the variance in a separate browsing evaluation.",
            "So the rule is economic: use several agents when the task is valuable enough to pay for the extra performance, and when it genuinely exceeds what one context can hold. Do not spawn one for a two-line lookup.",
          ],
        },
        {
          type: "section",
          title: "Subagents in Pi",
          body: [
            "Pi ships an official subagent extension in its examples. Each subagent runs in a separate `pi` process with its own context window. You define agents as Markdown files with frontmatter (`name`, `description`, `tools`, `model`), and the extension can run one agent, several in parallel, or a chain where each step receives the previous step's output.",
            "The sample set shows how roles differ: a scout (fast recon on a cheap model, read tools only), a planner, a reviewer (told bash is read-only), and a worker with full capabilities. Workflow prompts such as `/implement` and `/implement-and-review` chain them.",
          ],
        },
        { type: "code", language: "markdown", filename: "~/.pi/agent/agents/doc-scout.md", code: agentDefinition },
        {
          type: "note",
          variant: "danger",
          title: "Danger",
          text: "Project-local agents (`.pi/agents/*.md`) are prompts the repository controls, and they can tell the model to run commands. By default the extension loads only your own user-level agents. Enable project agents only for repositories you trust (Level 4).",
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "How we built our multi-agent research system, Anthropic Engineering", url: "https://www.anthropic.com/engineering/multi-agent-research-system" },
            { title: "Building effective agents, Anthropic Engineering", url: "https://www.anthropic.com/engineering/building-effective-agents" },
            { title: "Pi subagent example", url: "https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions/subagent" },
            { title: "kcosr/pi-extensions", url: "https://github.com/kcosr/pi-extensions" },
          ],
        },
      ],
    },

    // ───────────────────────── 5.2 ─────────────────────────
    {
      slug: "multi-agent-patterns",
      title: "5.2 Multi-agent patterns",
      description: "Three shapes cover most multi-agent systems.",
      blocks: [
        {
          type: "section",
          title: "Workflows and agents",
          body: [
            "Anthropic draws a line that helps here. Workflows are systems where models and tools are orchestrated through predefined code paths. Agents direct their own process. Their advice is to find the simplest solution possible and add complexity only when it is needed.",
            "Most multi-agent systems are workflows: your code decides the structure, and agents fill in the steps. Three shapes cover most of them.",
          ],
        },
        {
          type: "table",
          headers: ["Shape", "How it works", "Use it when", "Typical failure"],
          rows: [
            ["Planner, implementer, reviewer", "One agent plans, one builds, one checks", "Work has distinct phases with different skills", "The reviewer is too lenient on the builder's output"],
            ["Fan-out / fan-in", "Run workers in parallel, then merge their reports", "Independent investigations of separate areas", "Overlapping or vague briefs; one failure sinks the run"],
            ["Pipeline with gates", "Stages in order, with an objective check between them", "A stage must be correct before the next starts", "A gate that is too weak, or no gate at all"],
          ],
        },
        {
          type: "section",
          title: "Fan-out and fan-in",
          body: [
            "Run workers at the same time with `Promise.all`, then make one more call that sees only their reports. Two details matter. Use `Promise.allSettled`, so one failed worker does not discard the others' work, and tell the synthesizer which worker failed. And give each worker a full brief with its own scope, because vague overlapping tasks make workers duplicate each other.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-5/lib/patterns.ts", code: patterns },
        { type: "code", language: "ts", filename: "examples/level-5/02-fan-out.ts", code: fanOut },
        {
          type: "section",
          title: "A pipeline with a gate",
          body: [
            "In the second shape, an implementer writes code, a gate checks it, and only then does a reviewer look. The gate is not a model. It is a real command, here `node --test`, that passes or fails. On a failure, its output goes back to the implementer as feedback, up to a limit. The reviewer only ever sees work that already passed.",
            "The demo project ships with tests and no implementations. The tests are the specification, so the agent's job is unambiguous.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-5/03-pipeline-gate.ts", code: pipelineGate },
        {
          type: "note",
          variant: "tip",
          title: "Tip",
          text: "Put a deterministic check (tests, lint, a schema) between agents. Anthropic found that an LLM evaluator tends to be generous toward LLM-written output. Separating the evaluator helps, but a real test never gets generous.",
        },
        {
          type: "section",
          title: "Shared state",
          body: [
            "Agents need somewhere to leave their work for the next stage. Three options: files, git commits, and message passing (returning text, as these examples do). Prefer files and commits when the work is long or must be resumed, because you can inspect them, diff them and restart from them. Message passing is simplest for short handoffs, as long as each message is complete on its own.",
          ],
        },
        {
          type: "example",
          title: "Real-life example",
          context: "DevOps",
          text: "This is a CI pipeline: build, then test, then deploy, and each stage blocks the next. Nobody asks the build step whether the tests are probably fine. The gate in this pipeline plays the same role between agents.",
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Building effective agents, Anthropic Engineering", url: "https://www.anthropic.com/engineering/building-effective-agents" },
            { title: "Harness design for long-running application development, Anthropic Engineering", url: "https://www.anthropic.com/engineering/harness-design-long-running-apps" },
            { title: "How we built our multi-agent research system, Anthropic Engineering", url: "https://www.anthropic.com/engineering/multi-agent-research-system" },
            { title: "The state of AI harness engineering 2026, Marmelab", url: "https://marmelab.com/blog/2026/09/24/the-state-of-ai-harness-engineering-2026.html" },
          ],
        },
      ],
    },

    // ───────────────────────── 5.3 ─────────────────────────
    {
      slug: "long-running-agents",
      title: "5.3 Long-running agents",
      description: "A task longer than one context window needs state outside the window.",
      blocks: [
        {
          type: "section",
          title: "Shifts with no memory",
          body: [
            "Most real projects cannot be finished inside one context window. Anthropic's description is the clearest: imagine engineers working in shifts, where each new engineer arrives with no memory of the previous shift. Without a handoff, every shift starts blind.",
            "The fix is the same as for people. Put the state somewhere that survives: in files, not in the model.",
          ],
        },
        {
          type: "section",
          title: "A pattern that works",
          body: [
            "In late 2025 Anthropic described a two-part setup for agents working across many context windows. An initializer session sets up the environment once: an `init.sh` script, a progress file, and a feature list. After that, every session is a coding agent that makes incremental progress on one feature and leaves clear artifacts for the next.",
            "Two failures motivated it: agents tried to do too much at once, and they declared the project complete too early. Hence the feature list, which they store as JSON because the model is less likely to inappropriately change or overwrite JSON than Markdown. Agents may edit only a `passes` field, and each session ends with the environment in a clean state.",
          ],
        },
        {
          type: "section",
          title: "State, in code",
          body: [
            "The module below is that pattern in about 65 lines. `feature_list.json` holds the tasks. `PROGRESS.md` is an append-only log. `reentryPrompt` builds the message that starts every session, written for an agent with no memory. And `runFeatures` loops: take the first unfinished feature, run an agent, run a gate, and only if the gate passes does the harness mark it done.",
            "Notice who flips `passes`. The agent does not. The harness does, after a real test passed. The agent cannot declare victory early, because it has no way to.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-5/lib/progress.ts", code: progress },
        {
          type: "section",
          title: "Run it, kill it, run it again",
          body: [
            "The example keeps its workspace in a fixed folder, so a restart finds the same files. Press Ctrl+C partway through, run it again, and it resumes at the first feature that has not passed. A test proves this: it simulates a process dying during the second feature, then starts a brand-new run with no memory and asserts that only the remaining features are attempted.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-5/04-progress-file.ts", code: progressFile },
        {
          type: "section",
          title: "Compaction or a reset?",
          body: [
            "Anthropic's March 2026 write-up on multi-hour application building adds a wrinkle. Some models show what they call context anxiety: they start wrapping up work early as they approach what they believe is their context limit. Compaction keeps continuity but does not give a clean slate, so the anxiety can persist. In their earlier testing, Claude Sonnet 4.5 showed it strongly enough that compaction alone was not sufficient, and context resets became essential.",
            "A reset means clearing the window entirely and starting a fresh agent with a structured handoff carrying the state and next steps. That is exactly what the re-entry prompt above is. The cost is that the handoff must contain enough for the next agent to continue cleanly. Treat this as model-specific evidence, and measure on the model you actually use.",
          ],
        },
        {
          type: "section",
          title: "Wakeups and schedules",
          body: [
            "A long job is often many short runs. A cron job, a queue worker or a scheduled cloud agent starts a fresh run, which reads its state from the files, does one unit of work, writes its state and exits. Because every run starts from files, a crash costs you one unit of work, not the whole job. Pi's print mode (5.4) makes this a one-line command.",
          ],
        },
        {
          type: "section",
          title: "Stop a stuck agent",
          body: [
            "An agent that is failing often keeps trying the same thing. A loop guard watches the tool calls: it hashes the tool name plus its arguments (with keys sorted, so a reordered call still matches) and trips when the same call repeats too many times in a short window, or when the total number of calls exceeds a budget. It runs in `beforeTool`, so it can stop the run before the tool executes.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-5/lib/loop-guard.ts", code: loopGuard },
        {
          type: "section",
          title: "Watch it trip",
          body: [
            "This demo needs no API key. A scripted fake model plays a confused agent that repeats the same failing search. The guard stops it on the third identical call, long before the 20 calls it could have made.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-5/05-loop-guard.ts", code: loopGuardDemo },
        {
          type: "note",
          variant: "warning",
          title: "Warning",
          text: "Claude's task budgets (beta) give the model a running countdown of tokens for the whole agentic loop, which helps it pace itself. They are advisory, not enforced. Keep your own hard limits too: a turn cap, a loop guard, and a wall-clock timeout.",
        },
        {
          type: "note",
          variant: "danger",
          title: "Danger",
          text: "A long-running agent with no budget and no loop guard is a runaway bill. Set the limits before you start the run, not after the first surprise invoice.",
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Effective harnesses for long-running agents, Anthropic Engineering", url: "https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents" },
            { title: "Harness design for long-running application development, Anthropic Engineering", url: "https://www.anthropic.com/engineering/harness-design-long-running-apps" },
            { title: "Task budgets, Claude docs", url: "https://platform.claude.com/docs/en/build-with-claude/task-budgets" },
          ],
        },
      ],
    },

    // ───────────────────────── 5.4 ─────────────────────────
    {
      slug: "headless-and-sdk",
      title: "5.4 Headless and SDK use",
      description: "The harness without the terminal: run agents from code, CI, and chat.",
      blocks: [
        {
          type: "section",
          title: "Four modes and an SDK",
          body: [
            "The interactive terminal is one way to run Pi. The same agent, sessions, resources and tools are available through other interfaces, so you can call it from scripts, programs and CI.",
          ],
        },
        {
          type: "table",
          headers: ["Mode", "Interface", "Lifetime", "Use it when"],
          rows: [
            ["Interactive", "Terminal UI", "Until you exit", "A person is working with Pi"],
            ["Print (`--print`)", "Final text on stdout", "One invocation", "A script needs the final answer"],
            ["JSON (`--mode json`)", "JSONL events on stdout", "One invocation", "A process needs structured progress"],
            ["RPC (`--mode rpc`)", "JSONL commands, responses and events", "Long-lived", "A process needs two-way control"],
            ["SDK", "TypeScript API in your process", "Your program's", "You want direct access to sessions, tools and models"],
          ],
        },
        {
          type: "section",
          title: "Print mode",
          body: [
            "Print mode runs the prompt, writes the final assistant text to stdout and exits. When input or output is piped, Pi selects it automatically. That makes it a one-line building block for scripts and cron jobs.",
          ],
        },
        {
          type: "code",
          language: "bash",
          filename: "snippet",
          code: `# Review what changed, read-only, and keep the result
git diff | pi --print --tools read,grep,find,ls "Review this change" > review.md

# Structured events instead of final text
pi --mode json "Inspect this repository" > events.jsonl`,
        },
        {
          type: "note",
          variant: "info",
          title: "Exit codes and events",
          text: "A final response that ends in an error or abort makes print mode exit nonzero. In JSON mode a failed run appears in the event stream without changing the exit status, so check the events. `agent_end` is not the end of automatic work (retries can follow); wait for `agent_settled`.",
        },
        {
          type: "section",
          title: "The SDK",
          body: [
            "The SDK embeds the agent in a Node or Bun process. `createAgentSession()` makes a session that owns one conversation, its model and tools. `session.prompt()` resolves when the run finishes, including automatic retries, and `subscribe()` streams events. If a prompt arrives while the session is already streaming, you must choose `steer()` (enter after the current turn) or `followUp()` (enter after the run). Always call `dispose()` when done.",
            "Use an in-memory session manager when you do not want files written. SDK sessions do not load MCP, codemode or tool search by default, so add those extension factories yourself if you need them.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-5/06-pi-sdk.ts", code: piSdk },
        {
          type: "section",
          title: "An agent reviewer in CI",
          body: [
            "A CI agent runs untrusted input: a pull request is text and code that someone else wrote. The workflow below is the print-mode command from above, arranged so that a hostile pull request can do little. Each choice is deliberate.",
          ],
        },
        { type: "code", language: "yaml", filename: ".github/workflows/agent-review.yml", code: agentReview },
        {
          type: "table",
          headers: ["Choice", "Why"],
          rows: [
            ["`pull_request`, not `pull_request_target`", "GitHub warns that `pull_request_target` or `workflow_run` combined with a checkout of an untrusted pull request exposes the repository"],
            ["`if: head.repo == this repo`", "For forks, secrets are not passed to the runner (except the token), and the token is read-only. The review could not run anyway, so skip it cleanly"],
            ["Minimal `permissions`", "GitHub advises the token have the least privileges required, with read-only contents as the default"],
            ["`persist-credentials: false`", "Otherwise checkout leaves the token in `.git/config`, where the agent could read it"],
            ["Two steps, split credentials", "The agent has the model key and no GitHub token. The step that posts the comment has the token and runs no agent"],
            ["`BASE_SHA` through `env`", "GitHub's guidance: pass untrusted or event values through an intermediate environment variable, not into the shell script text"],
            ["Read-only tools, `--no-approve`, `--no-context-files`, `--no-extensions`, `--no-skills`, `--no-mcp`", "Nothing from the repository (instruction files, extensions, skills, MCP config) can change the agent's tools or rules"],
            ["`timeout-minutes`", "A stuck agent must not run, and bill, for hours"],
          ],
        },
        {
          type: "note",
          variant: "danger",
          title: "Danger",
          text: "Never give an agent write access, or a secret, while it reads a pull request from a fork. Untrusted code plus a credential is how secrets leak. The safe version is the one above: no secrets reach fork runs at all.",
        },
        {
          type: "section",
          title: "Other frontends",
          body: [
            "The same pieces power other front doors. A cron job runs print mode on a schedule. A web UI or desktop app can drive Pi over RPC or the SDK. For chat, Pi's repository points to `pi-chat`, an extension that bridges Discord and Telegram channels to a sandboxed Pi session, with each connected channel getting its own micro-VM. That is Level 4's sandboxing put to work.",
          ],
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Pi SDK", url: "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md" },
            { title: "Pi CLI integration (print, JSON, RPC)", url: "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli-integration.md" },
            { title: "Pi command line reference", url: "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md" },
            { title: "pi-chat", url: "https://github.com/earendil-works/pi-chat" },
            { title: "GitHub Actions: secure use reference", url: "https://docs.github.com/en/actions/reference/security/secure-use" },
            { title: "GitHub Actions: security hardening", url: "https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions" },
          ],
        },
      ],
    },
  ],
};
