import agentsMdSample from "../../../examples/level-1/01-agents-md-sample.md?raw";
import type { Topic } from "./types.ts";

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
          headers: ["Harness", "Source", "Reads AGENTS.md", "Reads CLAUDE.md", "Notes"],
          rows: [
            ["Claude Code", "Closed", "Yes, from v2.1.277, when there is no `CLAUDE.md` (a setting loads both)", "Yes", "Extended through MCP servers, skills and plugins; permission prompts before risky actions."],
            ["Codex CLI", "Open", "Yes", "—", "Listed on agents.md as OpenAI Codex."],
            ["Gemini CLI", "Open", "Yes", "—", "Listed on agents.md."],
            ["Amp", "Closed", "Yes", "—", "Listed on agents.md."],
            ["Cursor", "Closed", "Yes", "—", "Listed on agents.md."],
            ["Droid", "Closed", "Yes", "—", "Factory's agent; listed on agents.md as Factory."],
            ["Pi", "Open", "Yes", "Yes", "MCP via `mcp.json`; extensions, skills, prompts in `extensions/`, `skills/`, `prompts/`."],
          ],
        },
        {
          type: "note",
          variant: "info",
          title: "Info",
          text: "A dash means the sources checked do not say, not that the answer is no.",
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
            "SWE-bench gives an agent real GitHub issues and checks whether its patch makes the project's tests pass. Terminal-Bench gives agents terminal tasks. LangChain's result above is on version 2.0, which it describes as 89 tasks across areas like machine learning, debugging, and biology; the site has since moved to version 4.0, so compare scores only within one version.",
            "Both measure a harness and model together, on a fixed task set. They do not measure how the agent behaves in your repo, with your conventions, on your Tuesday.",
          ],
        },
        {
          type: "note",
          variant: "info",
          title: "Info",
          text: "Leaderboards change monthly. Read the harness + model pair, not just the model name.",
        },
        {
          type: "steps",
          title: "Try it",
          items: [
            "Pick two harnesses from the table and find, in their docs, which instruction file each reads. Does your repo have one?",
            "Open the Terminal-Bench leaderboard and find two entries with the same model and different harnesses. How far apart are they?",
          ],
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
            { title: "arXiv 2609.00006 — Harness Engineering: a source-code study of eleven systems", url: "https://arxiv.org/abs/2609.00006" },
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
          type: "section",
          title: "What you are installing",
          body: [
            "Pi is a terminal coding agent: the Level 0 loop with four file and shell tools, a session store, and a text UI. In this lesson you install it, point it at a throwaway repo, and watch which tools it calls. By the end you should be able to read a Pi session and say what the model asked for and why.",
          ],
        },
        {
          type: "steps",
          items: [
            "Install with the script from the README: `curl -fsSL https://pi.dev/install.sh | sh` (Windows: `powershell -c \"irm https://pi.dev/install.ps1 | iex\"`). Piping a script into a shell runs whatever it contains, so open the URL and read it first; Level 4 explains why.",
            "Or install with npm: check Node is 22.19 or newer (`node -v`), then `npm install -g --ignore-scripts @earendil-works/pi-coding-agent`.",
            "Set a provider key, either with `export ANTHROPIC_API_KEY=sk-ant-...` or by running `/login` inside Pi (saved to `auth.json`).",
            "`cd` into a throwaway repo and run `pi`.",
            "Type `/model` to pick a model.",
          ],
        },
        {
          type: "note",
          variant: "warning",
          title: "Warning",
          text: "Older posts show `@mariozechner/pi-coding-agent`; the README now uses `@earendil-works/pi-coding-agent`. Install from the README, and check the publisher on npm before you run it.",
        },
        {
          type: "section",
          title: "Config layout",
          body: [
            "Global config lives in `~/.pi/agent/`: `settings.json`, `keybindings.json`, `mcp.json`, `models.json`, `auth.json`, plus `extensions/`, `skills/`, `prompts/`, `themes/`. Set `PI_CODING_AGENT_DIR` to move it.",
            "Project config lives in `.pi/` in your working directory — `settings.json`, `mcp.json`, `SYSTEM.md`, `APPEND_SYSTEM.md`, and the same resource folders. Pi loads it only after you trust the project (`/trust`).",
            "Same idea as a global `~/.npmrc` and a project `.npmrc`: global defaults, project overrides.",
            "Four tools are on by default: `read`, `bash`, `edit` and `write`. The others in the table below are built in but off until you list them in `defaultTools` in `settings.json`. A `+` adds a tool to the defaults and a `-` removes one, so `[\"+grep\", \"+find\", \"+ls\"]` adds the three search tools, and `[\"-bash\", \"+powershell\"]` swaps the shell on Windows.",
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
          variant: "tip",
          title: "Tip",
          text: "If the model never searches, check `defaultTools` first: `grep`, `find` and `ls` are off until you add them.",
        },
        {
          type: "section",
          title: "First task walkthrough",
          body: [
            "Start with something read-only: ask Pi to \"explain this repo\". Watch which tools it calls and in what order. Press `ctrl+o` to expand or collapse tool output.",
            "Then ask for one tiny edit — rename a variable, fix a typo. Pi applies it immediately; there is no accept step. Read the `edit` call as it scrolls past, then check the result with `git diff`.",
            "Pi's tools run with the permissions of the Pi process, and it does not ask before every tool call. Use a test repo until you trust the habit.",
          ],
        },
        {
          type: "steps",
          title: "What you should see",
          items: [
            "For \"explain this repo\": a few `read` calls (often `README.md` and `package.json` first), maybe a `bash` call such as `ls`, then a text answer. No `edit` or `write`.",
            "For the tiny edit: a `read` of the file, then one `edit` call showing the old and new text, then a one-line summary.",
            "`git diff` shows exactly that change and nothing else. If it shows more, ask Pi why before you go on.",
          ],
        },
        {
          type: "table",
          headers: ["Command / key", "What it does"],
          rows: [
            ["`/model`", "Select a model (also `ctrl+l`)"],
            ["`/tree`", "Navigate the session tree (also Esc Esc on an empty editor; setting `doubleEscapeAction`)"],
            ["`/fork`", "Start a new session from an earlier message of this one"],
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
          type: "steps",
          title: "Try it",
          items: [
            "Install Pi and run it in a throwaway repo. Ask it to explain the repo and list the tools it called, in order.",
            "Add `[\"+grep\", \"+find\", \"+ls\"]` to `defaultTools`, run `/reload`, ask the same question, and compare the tool calls.",
            "Press Esc Esc to open `/tree` and find your first message in the session tree.",
          ],
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
            "Pi loads context files named `AGENTS.md` or `CLAUDE.md` (and `AGENTS.override.md`, which replaces them in its own directory) from the agent directory, your working directory, and its parent directories. Claude Code reads `CLAUDE.md`, and from v2.1.277 also `AGENTS.md` when there is no `CLAUDE.md`; an `@AGENTS.md` line in `CLAUDE.md` makes one file serve both.",
            "It is very common: a 2026 study of 2,853 GitHub repos found at least one context file in 2,586 of them (90.6% of repos). Of the 4,768 context files it found, 34.4% were `CLAUDE.md` and 31.6% were `AGENTS.md`. The sample is popular open-source repos, so expect lower numbers in private codebases.",
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
            ["File listings", "No", "The agent can run `ls`; they go stale. Folder roles (\"`src/data/` holds lesson content\") are architecture, so they stay"],
            ["Secrets", "Never", "The file is sent to a model provider"],
          ],
        },
        {
          type: "code",
          language: "markdown",
          filename: "examples/level-1/01-agents-md-sample.md",
          code: agentsMdSample,
        },
        {
          type: "section",
          title: "Hierarchy",
          body: [
            "Instruction files stack: a global one in your agent directory, then one per directory from the filesystem root down to where you started Pi. Pi walks up from the working directory, not down: an `AGENTS.md` in a subfolder below it is not loaded unless you start Pi in that subfolder. agents.md describes the opposite convention, where the file nearest to the file being edited applies, so harnesses differ here.",
            "When files conflict, the closest one should win — that is the rule agents.md states. Pi documents an explicit override file (`AGENTS.override.md` replaces `AGENTS.md` in the same directory) but not a full precedence order, so test it rather than assume.",
          ],
        },
        {
          type: "note",
          variant: "warning",
          title: "Warning",
          text: "The model follows rule files most of the time, not always. Anything that must hold — never run a command, never touch a path — needs enforcement in code. That is Level 4 (hooks and permissions).",
        },
        {
          type: "note",
          variant: "danger",
          title: "Danger",
          text: "Pi loads context files without asking for project trust. Clone an unfamiliar repo, start Pi in it, and its `AGENTS.md` is in your system prompt before you type anything. Read it first, or start Pi with `--no-context-files`. Level 4.4 covers this attack.",
        },
        {
          type: "example",
          title: "This repo's own CLAUDE.md",
          context: "Real repo",
          text: "It opens with the exact commands: Bun, because `npm` refuses to run here, and the `vp` scripts. Then the architecture — what lives in `src/`, how the `@/` alias is wired in both `tsconfig.json` and `vite.config.ts`. Then constraints like \"relative imports include the extension\". Each line answers a question the agent would otherwise get wrong on its first try. Nothing in it is generic advice.",
        },
        {
          type: "steps",
          title: "Try it",
          items: [
            "Write an `AGENTS.md` for one of your own repos: commands, architecture, constraints. Keep it under 40 lines.",
            "Start Pi in that repo and ask \"How do I run the tests?\" Does it answer from the file without searching?",
            "Delete one generic line (\"write clean code\") and check whether anything changes. It should not.",
          ],
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
          title: "Danger",
          text: "A message saying \"done\" is a claim, not evidence. Open the test output. If there is none, it did not run.",
        },
        {
          type: "section",
          title: "Reading diffs",
          body: [
            "Pi writes to disk as it goes, so there is nothing to accept: the review happens after. Commit (or `git stash`) before each task so you have a clean checkpoint, run `git diff` when the agent says it is done, and `git checkout -- <file>` (or `git reset --hard`) to throw away what you do not want.",
            "In the diff, look for deleted or skipped tests, widened types, new `any`, commented-out code, and changes in files you never mentioned. Agents sometimes make a check pass by weakening the check.",
          ],
        },
        {
          type: "section",
          title: "Fresh session or continue?",
          body: [
            "Start fresh when the context is full of dead ends. Anthropic's Claude Code guide suggests clearing the session and writing a better prompt after two failed corrections, instead of a third; in Pi that is `/new`. Continue when the state matters — half-done work, decisions the agent just made.",
            "Pi has two middle options. `/tree` (or Esc Esc) jumps back to an earlier message and continues from there, keeping the dead end as a side branch. `/fork` copies the session up to an earlier message into a new one. `/compact` shrinks the current session instead. Level 2 covers why long contexts degrade.",
          ],
        },
        {
          type: "example",
          title: "Review it like a junior's PR",
          context: "Team",
          text: "You would not merge a junior's PR because the description says \"all fixed\". You would read the diff, run the tests, and ask why a test changed. Use the same checklist on agent output — the author is faster, not more trustworthy.",
        },
        {
          type: "steps",
          title: "Try it",
          items: [
            "Rewrite one of your recent vague prompts using the \"better prompt\" column: one goal, one check.",
            "Commit, ask Pi for a small change, then read `git diff` before anything else. Revert it with `git checkout`.",
            "Next time a session goes in circles twice, start a new one with a better prompt instead of a third correction.",
          ],
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
};
