import agentsMdSample from "../../../examples/level-1/01-agents-md-sample.md?raw"
import type { Topic } from "./types.ts"

export const level1: Topic = {
  slug: "using-a-harness",
  title: "Level 1 — Using a Harness",
  icon: "Terminal",
  subTopics: [
    {
      slug: "landscape",
      title: "1.1 Landscape (2026)",
      description: "Same models, different harnesses. The harness is why one agent beats another.",
      blocks: [
        {
          type: "section",
          title: "What a harness is",
          body: [
            "A harness is everything around the model: system prompt, tools, context management, permissions, and the UI you type into. The model is the engine; the harness is the car.",
            "You already met its core in Level 0: the observe → think → act loop. A harness is that loop, productionized — with a real tool set, real error handling, and a terminal UI on top.",
          ],
        },
        {
          type: "table",
          headers: ["Harness", "Reads AGENTS.md", "Reads CLAUDE.md", "Notes"],
          rows: [
            ["Claude Code", "No (not on the agents.md list)", "Yes", "Extended through MCP servers; permission prompts before risky actions."],
            ["Codex CLI", "Yes", "—", "Listed on agents.md as OpenAI Codex."],
            ["Gemini CLI", "Yes", "—", "Listed on agents.md."],
            ["Amp", "Yes", "—", "Listed on agents.md."],
            ["Cursor", "Yes", "—", "Listed on agents.md."],
            ["Pi", "Yes", "Yes", "Open source on GitHub. MCP via `mcp.json`; extensions, skills, prompts in `extensions/`, `skills/`, `prompts/`."],
          ],
        },
        {
          type: "note",
          variant: "info",
          title: "Not in the table",
          text: "Droid is left out: no fetched source states its instruction-file behavior. A dash means the sources checked do not say, not that the answer is no.",
        },
        {
          type: "section",
          title: "Open vs closed, and what minimal buys you",
          body: [
            "Closed harnesses ship features fast and hide the internals. Open ones let you read the prompt, the tool schemas, and the loop. Reading the source is the fastest way to learn what a harness really does.",
            "Pi is the minimal pick for this course: four default tools (`read`, `write`, `edit`, `bash`), source you can read in an afternoon, and extensions you write in TypeScript. Less to learn, less to hide behind.",
          ],
        },
        {
          type: "example",
          title: "Same model, different harness, different rank",
          context: "Benchmark",
          text: "LangChain took its coding agent (deepagents-cli) from just outside the Top 30 to the Top 5 on Terminal Bench 2.0 — 52.8 to 66.5 — while keeping the model fixed (gpt-5.2-codex). They only changed the harness: prompts, tools, middleware. Their post is dated February 17, 2026.",
        },
        {
          type: "section",
          title: "Benchmarks as scoreboards",
          body: [
            "SWE-bench gives an agent real GitHub issues and checks whether its patch makes the project's tests pass. Terminal-Bench 2.0 gives agents terminal tasks — LangChain describes it as 89 tasks across areas like machine learning, debugging, and biology.",
            "Both measure a harness and model together, on a fixed task set. They do not measure how the agent behaves in your repo, with your conventions, on your Tuesday.",
          ],
        },
        {
          type: "note",
          variant: "info",
          title: "Read the pair",
          text: "Leaderboards change monthly. The Terminal-Bench site now headlines version 4.0, for example. Read the harness + model pair, not just the model name.",
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "SWE-bench", url: "https://www.swebench.com/" },
            { title: "Terminal-Bench", url: "https://www.tbench.ai/" },
            { title: "LangChain — Improving Deep Agents with harness engineering", url: "https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering" },
            { title: "Faros — Harness engineering guide", url: "https://www.faros.ai/blog/harness-engineering" },
            { title: "arXiv 2609.00006 — Harness Engineering: a source-code study of eleven systems", url: "https://arxiv.org/pdf/2609.00006" },
          ],
        },
      ],
    },
    {
      slug: "pi-first-session",
      title: "1.2 Pi: install and first session",
      description: "Install a minimal harness and read what it actually does.",
      blocks: [
        {
          type: "steps",
          items: [
            "Check Node: Pi needs Node.js 22.19 or newer. Run `node -v`.",
            "Install: `npm install -g --ignore-scripts @earendil-works/pi-coding-agent`.",
            "Set a provider key, either with `export ANTHROPIC_API_KEY=sk-ant-...` or by running `/login` inside Pi (saved to `auth.json`).",
            "`cd` into a throwaway repo and run `pi`.",
            "Type `/model` to pick a model.",
          ],
        },
        {
          type: "note",
          variant: "warning",
          title: "Two package scopes",
          text: "Older posts show `@mariozechner/pi-coding-agent`; the README now uses `@earendil-works/pi-coding-agent`. Install from the README, and check the publisher on npm before you run it.",
        },
        {
          type: "section",
          title: "Config layout",
          body: [
            "Global config lives in `~/.pi/agent/`: `settings.json`, `keybindings.json`, `mcp.json`, `models.json`, `auth.json`, plus `extensions/`, `skills/`, `prompts/`, `themes/`. Set `PI_CODING_AGENT_DIR` to move it.",
            "Project config lives in `.pi/` in your working directory — `settings.json`, `mcp.json`, `SYSTEM.md`, `APPEND_SYSTEM.md`, and the same resource folders. Pi loads it only after you trust the project (`/trust`).",
            "Same idea as a global `~/.npmrc` and a project `.npmrc`: global defaults, project overrides.",
          ],
        },
        {
          type: "table",
          headers: ["Tool", "What it does", "When the model reaches for it"],
          rows: [
            ["`read`", "Reads a file", "Before editing; to understand code"],
            ["`bash`", "Runs a shell command", "Tests, builds, git, anything not covered below"],
            ["`powershell`", "Runs a PowerShell command", "An alternative to `bash`, for example on Windows"],
            ["`edit`", "Diff-based edit of an existing file", "Small, targeted changes"],
            ["`write`", "Creates or overwrites a file", "New files, full rewrites"],
            ["`grep`", "Content search", "Finding where a symbol is used"],
            ["`find`", "File search by pattern", "Finding files by name"],
            ["`ls`", "Directory listing", "Getting oriented in a folder"],
          ],
        },
        {
          type: "note",
          variant: "info",
          title: "Default vs extra tools",
          text: "Pi's settings docs list `read`, `bash`, `edit` and `write` as the default tools. The others are built in but off until you add them to `defaultTools` in `settings.json`, for example `[\"+grep\", \"+find\", \"+ls\"]`. On Windows you can swap in `powershell`: `[\"-bash\", \"+powershell\"]`.",
        },
        {
          type: "section",
          title: "First task walkthrough",
          body: [
            "Start with something read-only: ask Pi to \"explain this repo\". Watch which tools it calls and in what order. Press `ctrl+o` to expand or collapse tool output.",
            "Then ask for one tiny edit — rename a variable, fix a typo. Read the `edit` call before you accept the result.",
            "Pi's tools run with the permissions of the Pi process, and it does not ask before every tool call. Use a test repo until you trust the habit.",
          ],
        },
        {
          type: "table",
          headers: ["Command / key", "What it does"],
          rows: [
            ["`/model`", "Select a model (also `ctrl+l`)"],
            ["`/tree`", "Navigate the session tree"],
            ["`/new`, `/resume`", "Start a new session, or resume another"],
            ["`/compact`", "Compact the context"],
            ["`/login`, `/logout`", "Add or remove provider auth"],
            ["`/trust`", "Save the project trust decision"],
            ["`/mcp`", "Manage MCP servers"],
            ["`/reload`", "Reload keybindings, extensions, skills, and context files"],
            ["`/hotkeys`", "Show the active shortcuts"],
            ["`esc`", "Cancel / abort the current task"],
            ["`shift+tab`", "Cycle the thinking level"],
          ],
        },
        {
          type: "example",
          title: "A tool list that fits on one screen",
          context: "Design",
          text: "Pi ships four default tools. Every tool's name and schema is sent to the model on every turn, so each one costs context and adds another way to pick wrong. Fewer, sharper tools means more room for your code and fewer mistakes — you will see this tradeoff again in Level 3.",
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "pi.dev docs", url: "https://pi.dev/docs/latest" },
            { title: "Pi repository", url: "https://github.com/earendil-works/pi" },
            { title: "pi.dev deep dive", url: "https://urandom.io/blog/2026-03-07-pi-dev-deep-dive" },
            { title: "Pi sandbox analysis", url: "https://agent-safehouse.dev/docs/agent-investigations/pi" },
          ],
        },
      ],
    },
    {
      slug: "instruction-files",
      title: "1.3 Project instruction files",
      description: "`AGENTS.md` is the README for your agent. Short, specific, true.",
      blocks: [
        {
          type: "section",
          title: "What it is",
          body: [
            "An instruction file is a Markdown file the harness loads into the system prompt at the start of every session. agents.md calls it \"a README for agents\", and it has no required fields — just Markdown.",
            "Pi loads `AGENTS.md` and `CLAUDE.md` (also `AGENTS.override.md`) from the agent directory, your working directory, and its parent directories. Claude Code reads `CLAUDE.md`.",
            "It is very common: a 2026 study of 2,853 GitHub repos found context files in 2,586 of them (90.6%), with `CLAUDE.md` in 34.4% of files and `AGENTS.md` in 31.6%.",
          ],
        },
        {
          type: "table",
          headers: ["Content", "In the file?", "Why"],
          rows: [
            ["Build, test, lint, typecheck commands", "Yes", "The agent cannot guess your scripts"],
            ["Architecture spanning many files", "Yes", "Costly to rediscover each session"],
            ["Constraints (\"never edit `/generated`\")", "Yes", "Cannot be inferred from code"],
            ["Generic advice (\"write clean code\")", "No", "Costs attention, changes nothing"],
            ["File listings", "No", "The agent can run `ls`; they go stale"],
            ["Secrets", "Never", "The file is sent to a model provider"],
          ],
        },
        {
          type: "code",
          language: "markdown",
          filename: "AGENTS.md",
          code: agentsMdSample,
        },
        {
          type: "section",
          title: "Hierarchy",
          body: [
            "Instruction files stack: a global one in your agent directory, one at the project root, and more in subdirectories. A file applies in its directory and everything below it.",
            "When files conflict, the closest one should win — that is the rule agents.md states. Pi documents an explicit override file (`AGENTS.override.md` replaces `AGENTS.md` in the same directory) but not a full precedence order, so test it rather than assume.",
          ],
        },
        {
          type: "note",
          variant: "warning",
          title: "Rules are suggestions",
          text: "The model follows rule files most of the time, not always. Anything that must hold — never run a command, never touch a path — needs enforcement in code. That is Level 4 (hooks and permissions).",
        },
        {
          type: "example",
          title: "This repo's own CLAUDE.md",
          context: "Real repo",
          text: "It opens with the exact commands: Bun, because `npm` refuses to run here, and the `vp` scripts. Then the architecture — what lives in `src/`, how the `@/` alias is wired in both `tsconfig.json` and `vite.config.ts`. Then constraints like \"relative imports include the extension\". Each line answers a question the agent would otherwise get wrong on its first try. Nothing in it is generic advice.",
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "agents.md", url: "https://agents.md/" },
            { title: "Augment Code — Harness engineering guide", url: "https://www.augmentcode.com/guides/harness-engineering-ai-coding-agents" },
            { title: "arXiv 2602.14690 — Harness engineering for agentic AI coding tools", url: "https://arxiv.org/html/2602.14690v5" },
            { title: "Claude Code — Best practices (keep CLAUDE.md short)", url: "https://code.claude.com/docs/en/best-practices" },
          ],
        },
      ],
    },
    {
      slug: "working-with-an-agent",
      title: "1.4 Working effectively with an agent",
      description: "Your job shifts from typing code to specifying and verifying it.",
      blocks: [
        {
          type: "section",
          title: "Task decomposition",
          body: [
            "One clear goal per session. \"Add pagination to `/users`\", not \"improve the API\". A task you can state in one sentence, with a way to check it, is a task an agent can finish.",
          ],
        },
        {
          type: "table",
          headers: ["Problem", "Bad prompt", "Better prompt"],
          rows: [
            ["Vague", "Improve the API.", "Add `?page` and `?limit` to `GET /users`. Default limit 20, max 100. Return `{ items, total }`."],
            ["No check", "Fix the failing login test.", "Fix the failing login test. Run `bun test auth` and show me the output."],
            ["Too big", "Migrate the app to TypeScript.", "Convert `src/utils/` to TypeScript. Stop when `tsc --noEmit` passes. We do `src/routes/` next."],
            ["Implicit", "Fix the date bug.", "Dates show a day early in `formatDate` in `src/lib/format.ts`. Write a failing test first, then fix it."],
          ],
        },
        {
          type: "section",
          title: "The verification habit",
          body: [
            "Give the agent something it can run that comes back pass or fail, and ask for evidence: the command it ran and its output. Then read that output yourself.",
            "Anthropic's best-practices guide puts it plainly: Claude stops when the work looks done. Simon Willison makes the same point — agents get most of their value from \"a good, cleanly passing test suite\".",
          ],
        },
        {
          type: "note",
          variant: "danger",
          title: "\"Done\" is a claim",
          text: "A message saying \"done\" is a claim, not evidence. Open the test output. If there is none, it did not run.",
        },
        {
          type: "section",
          title: "Reading diffs",
          body: [
            "Run `git diff` before you accept anything. Look for deleted or skipped tests, widened types, new `any`, commented-out code, and changes in files you never mentioned. Agents sometimes make a check pass by weakening the check.",
          ],
        },
        {
          type: "section",
          title: "Fresh session or continue?",
          body: [
            "Start fresh when the context is full of dead ends. Anthropic's guide suggests running `/clear` and writing a better prompt after two failed corrections, instead of a third. Continue when the state matters — half-done work, decisions the agent just made.",
            "In Pi, `/new` starts a new session and `/compact` shrinks the current one. Level 2 covers why long contexts degrade.",
          ],
        },
        {
          type: "example",
          title: "Review it like a junior's PR",
          context: "Team",
          text: "You would not merge a junior's PR because the description says \"all fixed\". You would read the diff, run the tests, and ask why a test changed. Use the same checklist on agent output — the author is faster, not more trustworthy.",
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Best practices for Claude Code", url: "https://code.claude.com/docs/en/best-practices" },
            { title: "Simon Willison — Designing agentic loops", url: "https://simonwillison.net/2025/Sep/30/designing-agentic-loops/" },
          ],
        },
      ],
    },
  ],
}
