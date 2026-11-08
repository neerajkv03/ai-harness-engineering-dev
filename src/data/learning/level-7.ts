import type { Topic } from "./types.ts";
// Code blocks import the runnable example files, so lesson code and examples/ can never drift apart.
import harnessMap from "../../../examples/level-7/lib/harness-map.ts?raw";
import mapDemo from "../../../examples/level-7/01-map-a-harness.ts?raw";
import evolution from "../../../examples/level-7/lib/evolution.ts?raw";
import evolutionDemo from "../../../examples/level-7/02-harness-evolution.ts?raw";
import browserTools from "../../../examples/level-7/lib/browser-tools.ts?raw";
import browserDemo from "../../../examples/level-7/03-browser-agent.ts?raw";
import workflow from "../../../examples/level-7/lib/workflow.ts?raw";
import workflowDemo from "../../../examples/level-7/04-typed-workflow.ts?raw";
import cacheDemo from "../../../examples/level-7/05-step-cache-demo.ts?raw";
import capLoop from "../../../examples/level-7/capstone/src/loop.ts?raw";
import capHarness from "../../../examples/level-7/capstone/src/harness.ts?raw";
import capBench from "../../../examples/level-7/capstone/bench.ts?raw";

export const level7: Topic = {
  slug: "advanced",
  title: "Level 7 — Advanced and Research Frontier",
  icon: "FlaskConical",
  subTopics: [
    // ───────────────────────── 7.1 ─────────────────────────
    {
      slug: "architecture",
      title: "7.1 Harness architecture (source-level)",
      description: "Every harness is the same few parts. Learn to find them in any codebase.",
      blocks: [
        {
          type: "section",
          title: "What the research found",
          body: [
            "\"Harness Engineering: Anatomy, Architecture, and Evolution of Coding Agents\" (arXiv 2609.00006) read the source of eleven coding-agent systems and compared them. It names seven subsystems that every one of them has, plus an interface layer (terminal, IDE, web) and a session substrate (how state is stored and resumed).",
            "The useful result is how little varies. The paper reports that none of the eleven builds on an agent framework, none uses vector retrieval (RAG) over code, and skills are more common than MCP (9 of 11 versus 8 of 11). The loop is small. The differences are in the safety, memory and extension layers.",
          ],
          links: [{ title: "arXiv 2609.00006 — Harness Engineering (eleven systems)", url: "https://arxiv.org/abs/2609.00006" }],
        },
        {
          type: "table",
          title: "The seven subsystems, from minimal to maximal",
          headers: ["Subsystem", "Smallest version that works", "Production version", "You met it in"],
          rows: [
            ["Agent loop", "A `while` loop: call model, run tools, repeat", "Streaming, interruption, queued messages, retries", "Level 1, 5"],
            ["LLM integration", "One provider call", "Many providers, model switching, token accounting", "Level 1"],
            ["Tools and actions", "read, write, edit, bash", "Registry, schemas, output truncation, MCP bridges", "Level 3"],
            ["Memory and context", "Read `AGENTS.md` into the prompt", "Hierarchical instructions, compaction, session trees", "Level 2"],
            ["Safety and permissions", "A command deny-list in a hook", "Trust prompts, sandboxes, approval modes", "Level 4"],
            ["Orchestration", "One subagent that returns a summary", "Parallel agents, teams, worktrees", "Level 5"],
            ["Extensibility", "Load markdown skills", "Extensions, packages, marketplaces", "Level 3, 4"],
          ],
        },
        {
          type: "section",
          title: "Reading Pi's source",
          body: [
            "Pi is open source and small enough to read. Start with the loop, because everything else hangs off it. The paths below are in the `earendil-works/pi` repository.",
          ],
          links: [{ title: "Pi repository", url: "https://github.com/earendil-works/pi" }],
        },
        {
          type: "table",
          title: "Where each part lives in Pi",
          headers: ["Part", "File or folder", "Notes"],
          rows: [
            ["Agent loop", "`packages/agent/src/agent-loop.ts`", "Start here. Around 30 KB. `agent.ts` wraps it, `types.ts` defines events and messages."],
            ["Session, tying it together", "`packages/coding-agent/src/core/agent-session.ts`", "Large (about 170 KB). Read it by searching for what you need, not top to bottom."],
            ["Session storage", "`packages/coding-agent/src/core/session-manager.ts`", "JSONL files with a tree of entries (Level 2)."],
            ["System prompt", "`packages/coding-agent/src/core/system-prompt.ts`", "How instructions, tools and skills become the prompt."],
            ["Instruction files, skills, extensions", "`resource-loader.ts`, `skills.ts`, `extensions/`", "What gets loaded, from where, in what order."],
            ["Tools", "`core/tools/`", "One file per built-in tool, including `bash`."],
            ["Compaction", "`core/compaction/`", "When to summarize and where to cut."],
            ["Trust and safety", "`core/project-trust.ts`", "The project trust prompt from Level 4."],
          ],
        },
        {
          type: "steps",
          title: "A reading order that works",
          items: [
            "`agent-loop.ts`: find where the model is called, where tool calls are executed, and what ends the loop.",
            "`core/tools/bash.ts`: see what one real tool does about timeouts and output size (Level 3).",
            "`system-prompt.ts`: see what the model is told before your first message.",
            "`core/compaction/`: find the rule for when to summarize.",
            "`extensions/`: see how `pi.on(...)` events reach your code (Level 4).",
          ],
        },
        {
          type: "section",
          title: "Comparing production harnesses",
          body: [
            "The same seven parts show up in every production harness, built to different taste. Comparing a few makes the design space concrete. The table summarizes each project's own documentation as of late 2026; these products change monthly, so check the current docs before you rely on a row.",
          ],
        },
        {
          type: "table",
          title: "Four harnesses, side by side",
          headers: ["", "Pi", "Claude Code", "Codex CLI", "Gemini CLI"],
          rows: [
            ["Source", "Open (TypeScript)", "Closed", "Open (Rust)", "Open (TypeScript)"],
            ["Loop", "Small, readable `agent-loop.ts`", "Not public; observable through hooks and transcripts", "Public; in the `codex-rs` crates", "Public; in the `core` package"],
            ["Permissions", "None by default; add a `tool_call` hook (4.2). Project trust gates project config", "Allow / ask / deny rules per tool and pattern, plus permission modes (ask, accept edits, plan, bypass)", "Approval policy (when to ask) combined with an OS sandbox mode (read-only, workspace-write, full access)", "Confirmation prompts per tool, trusted folders, an auto-approve mode, optional container sandbox"],
            ["Sandbox", "Run the whole process in a container (4.3)", "Built-in OS sandbox for bash, optional", "Built in: Seatbelt on macOS, Landlock and seccomp on Linux", "Docker or Podman, or Seatbelt on macOS"],
            ["Extension model", "TypeScript extensions, skills, prompt templates, packages, MCP", "Hooks (shell commands on lifecycle events), skills, slash commands, subagents, MCP, plugins", "MCP, skills, `AGENTS.md`, custom prompts", "Extensions that bundle MCP servers, commands and `GEMINI.md` context"],
            ["Session storage", "JSONL tree under `~/.pi/agent/sessions/` (2.3, 6.2)", "JSONL transcripts per project under `~/.claude/`", "JSONL rollout files under `~/.codex/sessions/`", "Saved chats and checkpoints, resumable"],
          ],
        },
        {
          type: "section",
          title: "Harness as platform",
          body: [
            "Past a certain size, a harness stops being a tool and becomes a platform: the vendor ships the loop, and the community ships the capabilities. The paper above describes the same arc, from a fixed tool set to an extension system to an ecosystem. Pi packages (3.5) bundle extensions, skills, prompts and themes and install from npm or git. Claude Code plugins bundle commands, subagents, skills, hooks and MCP servers, and install from marketplaces, which are git repositories with a manifest. Gemini CLI extensions bundle MCP servers and context. The Agent Skills standard (3.3) makes one kind of extension portable across all of them.",
            "The platform view changes what you review. A plugin or package is code and prompts from someone else running with your permissions, so it gets the supply-chain treatment from 4.4: read it, pin its version, and prefer a small, auditable one over a large, convenient one.",
          ],
        },
        {
          type: "section",
          title: "Map any harness with 60 lines",
          body: [
            "The mapper below scores every file by how densely it uses the vocabulary of each subsystem and prints the top few per subsystem. It is a heuristic, not a parser, so treat the output as a reading list. It skips `node_modules`, `.git`, `target` and similar folders, and skips `dist` or `build` only when a `src` folder sits beside it, so it also works on a package installed from npm.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-7/lib/harness-map.ts", code: harnessMap },
        { type: "code", language: "ts", filename: "examples/level-7/01-map-a-harness.ts", code: mapDemo },
        {
          type: "section",
          title: "Run it on the capstone you will build",
          body: ["Run `bun run examples/level-7/01-map-a-harness.ts examples/level-7/capstone/src`. It prints the same seven headings. Point it at a folder you have never seen and it tells you where to start reading."],
        },
        {
          type: "code",
          language: "text",
          filename: "output (shortened)",
          code: `mapping examples/level-7/capstone/src

AGENT LOOP
  loop.ts  (11 hits, 3 KB)
  subagent.ts  (5 hits, 1 KB)
  harness.ts  (5 hits, 2 KB)

TOOLS AND ACTIONS
  tools.ts  (11 hits, 4 KB)
  loop.ts  (5 hits, 3 KB)

MEMORY AND CONTEXT
  harness.ts  (10 hits, 2 KB)
  compaction.ts  (6 hits, 3 KB)
  prompt.ts  (5 hits, 2 KB)`,
        },
        {
          type: "section",
          title: "What the paper recommends",
          body: [
            "The paper ends with 18 design recommendations drawn from the 29 patterns it catalogued. A few that match what you built in earlier levels: keep the loop simple and put the intelligence in the model; treat context as a budget and compact it deliberately; enforce safety in code (hooks, sandboxes), not in the prompt; prefer skills and plain files over heavy retrieval; trace everything. It also includes a scaffold of about 90 lines for a minimum viable harness, which is the same idea as the capstone in lesson 7.5.",
          ],
        },
        {
          type: "note",
          variant: "tip",
          title: "Read the loop first",
          text: "Everything else in a harness is either something the loop calls (tools, compaction, hooks) or something that configures it (prompt, skills, settings). Once you can find the loop, you can find the rest.",
        },
        {
          type: "steps",
          title: "Try it",
          items: [
            "Run `01-map-a-harness.ts` on Pi's installed package (`npm root -g`) and open the top file for the agent loop.",
            "In Pi's `agent-loop.ts`, find where the model is called and what ends the loop.",
            "Fill one column of the comparison table for a harness you use, from its own docs.",
          ],
        },
        {
          type: "example",
          title: "Real-life example",
          context: "Cars",
          text: "Every car has an engine, a transmission, brakes, steering and a dashboard, and a mechanic who knows that can open any hood. Harnesses are the same: a loop, tools, context, safety, orchestration, extensions. Learn the parts once and every new harness is a variation, not a mystery.",
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Harness Engineering paper (arXiv 2609.00006)", url: "https://arxiv.org/abs/2609.00006" },
            { title: "Pi agent loop source", url: "https://github.com/earendil-works/pi/blob/main/packages/agent/src/agent-loop.ts" },
            { title: "Pi agent session source", url: "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/agent-session.ts" },
            { title: "Pi tools folder", url: "https://github.com/earendil-works/pi/tree/main/packages/coding-agent/src/core/tools" },
            { title: "Pi compaction folder", url: "https://github.com/earendil-works/pi/tree/main/packages/coding-agent/src/core/compaction" },
          ],
        },
      ],
    },

    // ───────────────────────── 7.2 ─────────────────────────
    {
      slug: "self-improving",
      title: "7.2 Self-improving harnesses",
      description: "Let traces suggest harness changes. Keep a human on the merge button.",
      blocks: [
        {
          type: "section",
          title: "The idea",
          body: [
            "Level 6 gave you traces and an eval suite. Together they allow a loop: find where the agent failed, ask a model to propose one change to the harness (a tool's output format, a prompt line, a verification step), measure the change on the eval suite, and keep it only if it helps.",
            "Two recent papers study this. \"Agentic Harness Engineering\" (arXiv 2604.25850) treats the harness itself as the thing being optimized from observed runs. \"Harness-R1\" (arXiv 2608.02276) learns harness edits from failure trajectories: it trains a dedicated model (a 9B \"harness engineer\") with reinforcement learning (GRPO) to turn batches of agent failures into patches, and rewards a patch by rerunning the unchanged agent with it. Read their abstracts for the reported gains; this lesson builds the part that matters for engineering practice: the guardrails around such a loop.",
            "A limit of the demo, stated up front: it has three tasks, so the hold-out check uses fresh random seeds on the same tasks, not new tasks. A real suite keeps some tasks the loop never sees. Proposal 3 (`announceChecks`) changes a setting nothing reads, so it is inert by construction; it shows how the loop treats a change that does nothing.",
          ],
          links: [
            { title: "Agentic Harness Engineering (arXiv 2604.25850)", url: "https://arxiv.org/abs/2604.25850" },
            { title: "Harness-R1 (arXiv 2608.02276)", url: "https://arxiv.org/abs/2608.02276" },
          ],
        },
        {
          type: "section",
          title: "A harness you can safely edit",
          body: [
            "The demo has three harness files. `read-tool.json` sets the read cap and whether truncated output tells the model where to continue. `verify.json` controls when checks run. `permissions.json` says what the agent may do. The first two are editable by the proposer. The third is protected.",
            "Three tasks measure the result. `edit-after-cap` is the target: a file larger than the read cap that must be edited after a truncated read. `edit-small-file` and `edit-medium-file` are regression checks: things that worked before must still work. The tools are real; the model is a simulation that follows a truncation pointer 85% of the time, so the demo runs offline and costs nothing.",
          ],
        },
        {
          type: "steps",
          title: "How to read evolution.ts",
          items: [
            "Read the seven numbered steps in the header comment first: the whole file implements them in order.",
            "`checkProposal` is step 4, the guardrails. It runs before anything is measured, so an unsafe proposal costs nothing.",
            "`measure` runs every task several times with fixed seeds, so baseline and candidate face the same luck.",
            "`evolveOnce` is the loop: each `return` with `status: \"rejected\"` is one stage saying no. Read them as a list of reasons a change is not shipped.",
            "Skip `llmProposer` on the first read; it only turns a model reply into a proposal.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-7/lib/evolution.ts", code: evolution },
        { type: "code", language: "ts", filename: "examples/level-7/02-harness-evolution.ts", code: evolutionDemo },
        {
          type: "section",
          title: "Run it",
          body: ["`bun run examples/level-7/02-harness-evolution.ts` runs four proposals through the same pipeline and ends with a human review."],
        },
        {
          type: "code",
          language: "text",
          filename: "output",
          code: `1. say when output is truncated
  result: READY_FOR_REVIEW
  before: edit-after-cap 0%, edit-small-file 100%, edit-medium-file 100%
  after:  edit-after-cap 80%, edit-small-file 100%, edit-medium-file 100%

2. a smaller read cap, with a pointer
  result: REJECTED at the "regression" stage
  why:    edit-medium-file got worse: 100% -> 80%

3. announce when checks run
  result: REJECTED at the "no_improvement" stage
  why:    edit-after-cap: 0% -> 0% (p = 1.000), not a significant improvement

4. loosen the permissions
  result: REJECTED at the "guardrail" stage
  why:    "permissions.json" is protected or not a plain file name

--- human review ---
change:      read-tool.json -> {"cap":6000,"truncationPointer":true}
decision:    approve
status after review: merged`,
        },
        {
          type: "table",
          title: "Why each proposal was rejected",
          headers: ["Stage", "Question it asks", "Catches"],
          rows: [
            ["guardrail", "Is it an editable file, valid by schema, with a stated prediction?", "Edits to permissions, malformed changes, proposals with no hypothesis"],
            ["no_improvement", "Did the target task improve by more than noise?", "Changes that do nothing (uses the permutation test from Level 6)"],
            ["regression", "Did any other task get worse?", "A tighter read cap that fixed one task and broke another"],
            ["prediction", "Did the result match what the proposer predicted?", "Lucky wins nobody can explain"],
            ["holdout", "Does the win hold on fresh seeds no earlier stage looked at?", "A change that only looked good on the runs used to judge it"],
            ["review", "Does a human approve?", "Everything else. The loop never merges on its own."],
          ],
        },
        {
          type: "note",
          variant: "danger",
          title: "Never let a harness edit its own safety rules",
          text: "A loop that can edit its permission file can score better by removing the rules that make it fail. Keep permissions, hooks and sandbox settings outside the set of files the proposer may change, enforce that in code, and require a human to merge. Eval-driven improvement of a harness also overfits its test tasks if you run it long enough, so keep a held-out set it has never seen.",
        },
        {
          type: "steps",
          title: "Try it",
          items: [
            "Run `02-harness-evolution.ts` and match each rejected proposal to the stage that stopped it.",
            "Run the evolution tests: `node --test examples/level-7/lib/evolution.test.ts`.",
            "Write a fifth proposal that should pass every stage, and predict its improvement before you run it.",
          ],
        },
        {
          type: "example",
          title: "Real-life example",
          context: "Code review",
          text: "An automated harness change is a pull request from a very fast, very confident contributor. You would not let any contributor merge their own PR, change the CI config that checks it, or skip the tests because the description sounds convincing. The loop applies exactly those rules.",
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Agentic Harness Engineering (arXiv 2604.25850)", url: "https://arxiv.org/abs/2604.25850" },
            { title: "Harness-R1 (arXiv 2608.02276)", url: "https://arxiv.org/abs/2608.02276" },
          ],
        },
      ],
    },

    // ───────────────────────── 7.3 ─────────────────────────
    {
      slug: "computer-use",
      title: "7.3 Computer use and browser agents",
      description: "When there is no API, the agent uses the screen. Prefer the structure behind it.",
      blocks: [
        {
          type: "section",
          title: "A hierarchy of ways to act",
          body: [
            "Use the most structured option that works. An API or CLI is fastest, cheapest and least fragile. If you must use a web page, the accessibility tree gives the model the page as named roles (button \"Subscribe\", textbox \"Email\") at a fraction of the cost of images. Screenshots and mouse coordinates are the last resort, for software with no usable structure such as a desktop app.",
          ],
        },
        {
          type: "table",
          headers: ["Approach", "What the model sees", "Strengths", "Weaknesses"],
          rows: [
            ["API or CLI", "JSON, text", "Fast, exact, cheap", "Must exist"],
            ["Browser, accessibility tree", "Roles, names and refs", "Cheap, robust to restyling", "Misses things drawn on a canvas; custom widgets may expose little"],
            ["Computer use, screenshots", "Pixels", "Works on any software", "Slow, costly, can misclick, easiest to fool"],
          ],
        },
        {
          type: "section",
          title: "What Claude offers",
          body: [
            "Anthropic defines both toolsets, and your application executes them: nothing runs on Anthropic's side. `computer_toolset_20260801` is the screenshot-and-mouse toolset. `browser_toolset_20260801` drives a browser through structured page snapshots. Claude only asks for actions; your code takes the screenshot, moves the mouse and returns the result. Check the documentation for the exact type names on the model and platform you use, because they change between releases (Claude Opus 5.5 on the Claude API accepts only the toolset form of computer use).",
            "The computer toolset is one entry in `tools` with no name and no screen size. Claude's calls arrive as ordinary `tool_use` blocks whose `name` is the action (`screenshot`, `left_click`, `type`, `zoom` and others), each tagged `toolset_name: \"computer\"`, sometimes several in one turn. You answer each with a `tool_result` that echoes `toolset_name`; only `screenshot` and `zoom` results carry an image.",
          ],
          links: [
            { title: "Computer use tool", url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool" },
            { title: "Browser use tool", url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/browser-use-tool" },
          ],
        },
        {
          type: "code",
          language: "ts",
          filename: "snippet (the screenshot-action loop, simplified)",
          code: `const tools = [{ type: "computer_toolset_20260801" }]; // no name, no display size
const messages: Anthropic.MessageParam[] = [{ role: "user", content: "Open the display settings." }];

for (let turn = 0; turn < 30; turn++) {
  const res = await client.messages.create({ model: "claude-opus-5-5", max_tokens: 16000, tools, messages });
  messages.push({ role: "assistant", content: res.content });
  if (res.stop_reason !== "tool_use") break;

  const results = [];
  for (const block of res.content) {
    if (block.type !== "tool_use") continue;
    // The action is the block's NAME: screenshot, left_click, type, scroll, zoom...
    await desktop.perform(block.name, block.input); // your code: xdotool, a VM API, Playwright...
    const content = block.name === "screenshot" || block.name === "zoom"
      ? [{ type: "image", source: { type: "base64", media_type: "image/png", data: await desktop.screenshot() } }]
      : "OK";
    results.push({ type: "tool_result", tool_use_id: block.id, toolset_name: "computer", content });
  }
  messages.push({ role: "user", content: results }); // all results in ONE message
}`,
        },
        {
          type: "section",
          title: "Build the structured version yourself",
          body: [
            "Playwright 1.65 can return an AI-oriented accessibility snapshot with `page.ariaSnapshot({ mode: \"ai\" })`. Interactive elements carry refs such as `[ref=e12]`, and `page.locator(\"aria-ref=e12\")` acts on exactly that element. That is enough for five tools: `snapshot`, `click`, `fill`, `select`, `navigate`. This is conceptually the same design as Anthropic's browser tool: your app drives the browser and returns an accessibility tree with refs.",
            "Two details matter for safety. `navigate` accepts only hosts on an allow-list. And a catch-all route at the network layer aborts every other host, so a bug in the tool code cannot leak a request. The tool arguments are validated with Zod, and a validation failure is turned into a plain message the model can act on instead of a raw stack.",
          ],
          links: [{ title: "Playwright: Page API (ariaSnapshot)", url: "https://playwright.dev/docs/api/class-page" }, { title: "Playwright: aria snapshots", url: "https://playwright.dev/docs/aria-snapshots" }],
        },
        {
          type: "steps",
          title: "How to read browser-tools.ts",
          items: [
            "Skip `findBrowser` and the shop HTML at the top: they only make the demo run offline.",
            "In `openShop`, find the two `context.route` calls. The first blocks every request; the second lets the shop through. That is the network wall.",
            "`browserTools` is the part to study: five tools, each a few lines around one Playwright call.",
            "In `navigate`, find the host check. It is the first wall; the route in `openShop` is the second, behind it.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-7/lib/browser-tools.ts", code: browserTools },
        { type: "code", language: "ts", filename: "examples/level-7/03-browser-agent.ts", code: browserDemo },
        {
          type: "section",
          title: "Run it, with and without an attack",
          body: [
            "The demo opens an in-memory shop at `https://shop.example` in a local Chrome, Chromium or Edge (set `BROWSER_PATH` if it is not found). The agent subscribes an email address. Run it once normally, then with `--inject`.",
            "With `--inject`, the page hides off-screen text that tells the agent to visit another site. The script grades the outcome in the page and prints which requests were blocked at the network layer, so you see both whether the agent resisted and whether the defense held if it did not. This needs `ANTHROPIC_API_KEY`; the tool code itself is covered by offline tests that skip if no browser is installed.",
          ],
        },
        {
          type: "code",
          language: "bash",
          filename: "terminal",
          code: `bun run examples/level-7/03-browser-agent.ts
bun run examples/level-7/03-browser-agent.ts --inject`,
        },
        {
          type: "note",
          variant: "warning",
          title: "Warning",
          text: "Everything on a page, including text a human cannot see, reaches the model: this is Level 4's prompt injection with a far larger attack surface. Allow-list hosts, block everything else at the network layer, and keep the agent away from logged-in sessions you care about. Read the security precautions in Anthropic's computer-use docs before you build on it.",
        },
        {
          type: "example",
          title: "Test automation with a model choosing actions",
          context: "QA",
          text: "Playwright tests break when selectors change. Role-and-name locators (`getByRole(\"button\", { name: \"Subscribe\" })`) are the stable version, and an agent working from the accessibility tree uses the same idea: it finds the control by what it is, not by a CSS path. The cost is that each run is non-deterministic, so use an agent to explore or to write the test once, and keep the committed test deterministic.",
        },
        {
          type: "steps",
          title: "Try it",
          items: [
            "Run `03-browser-agent.ts`, then with `--inject`. Did the agent resist, and did the network wall block anything?",
            "Remove one host from `allowedHosts` and ask the agent to navigate there. Read the error it gets.",
          ],
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Computer use tool", url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool" },
            { title: "Browser use tool", url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/browser-use-tool" },
            { title: "Playwright: aria snapshots", url: "https://playwright.dev/docs/aria-snapshots" },
          ],
        },
      ],
    },

    // ───────────────────────── 7.4 ─────────────────────────
    {
      slug: "workflows",
      title: "7.4 Deterministic workflows around agents",
      description: "Code decides the structure. The model fills in the steps.",
      blocks: [
        {
          type: "section",
          title: "Workflow or agent?",
          body: [
            "Anthropic's \"Building effective agents\" separates two things. In a workflow, your code defines the steps and calls the model inside them. In an agent, the model decides the steps. Workflows are more predictable, cheaper and easier to test; agents handle problems whose steps you cannot write down in advance. The article describes five workflow patterns: prompt chaining, routing, parallelization, orchestrator-workers and evaluator-optimizer.",
            "The demo below is a chain with a router in the middle. It handles a support ticket: extract structured facts (model), decide which team gets it (plain code, no model), draft a reply and flag whether a human is needed (model).",
          ],
          links: [{ title: "Anthropic: Building effective agents", url: "https://www.anthropic.com/engineering/building-effective-agents" }],
        },
        {
          type: "section",
          title: "Typed handoffs",
          body: [
            "Each model step returns an object checked by a Zod schema. Structured outputs (`zodOutputFormat`) make the API return JSON of the right shape, but rules such as `.min(10)` or `.email()` are only checked by Zod, at our boundary. If validation fails, the step retries once with the validation error in the prompt (`maxAttempts` is 2), then throws a `StepError` naming the step. A bad value stops at the boundary where it was produced instead of surfacing three steps later. The workflow takes a `StepModel` interface, so tests run it with a scripted model and no API key.",
          ],
          links: [{ title: "Structured outputs", url: "https://platform.claude.com/docs/en/build-with-claude/structured-outputs" }],
        },
        {
          type: "steps",
          title: "How to read workflow.ts",
          items: [
            "The file has four parts, each under a `// ──` heading. Read them in order.",
            "The model: `StepModel` is the only thing the workflow knows about a model, which is why a fake can replace it.",
            "The typed step: `typedStep` validates, retries once with the exact error, then throws `StepError`.",
            "The cache: `stepKey` decides what counts as the same step; `StepCache.run` checks disk before computing.",
            "The workflow: `triageTicket` is just three calls in a row. Step 2 (`route`) is plain code.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-7/lib/workflow.ts", code: workflow },
        { type: "code", language: "ts", filename: "examples/level-7/04-typed-workflow.ts", code: workflowDemo },
        {
          type: "section",
          title: "Run it offline",
          body: ["`bun run examples/level-7/04-typed-workflow.ts --fake` uses a scripted model. Drop `--fake` to call Claude (needs `ANTHROPIC_API_KEY`)."],
        },
        {
          type: "code",
          language: "text",
          filename: "output (--fake, first run)",
          code: `1. extracted (model, validated by a schema):
 { product: 'billing', severity: 'high', summary: 'Customer was charged twice for the Pro plan.', customerEmail: 'ada@example.com' }

2. routed (plain code, no model):
 { team: 'payments', priority: 1, summary: 'Customer was charged twice for the Pro plan.' }

3. reply (model, validated by a schema):
 { subject: 'About your double charge', body: '...', needsHuman: true }

cache: 0 step(s) served from disk, 2 computed. Run it again: nothing is recomputed.`,
        },
        {
          type: "section",
          title: "Resumable runs",
          body: [
            "A step's result is stored on disk under a key made of a hash of the step name, a version string, the model's id and its input. The model is part of the key because the same prompt gets a different answer from a different model: without it, a real run after `--fake` would be served the fake's canned answers. If a run dies halfway, running it again skips the finished steps. If you change a step's prompt, bump its version and only that step reruns. Writes use a temporary file and a rename, so a crash cannot leave a half-written entry. The demo kills a run during the review step to show it.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-7/05-step-cache-demo.ts", code: cacheDemo },
        {
          type: "code",
          language: "text",
          filename: "output",
          code: `RUN 1: the process dies during the review step
  crashed: process killed
  model calls: extract, review
  on disk now: extract-f57ef077d92758c4.json

RUN 2: start again, same ticket
  model calls: review   <- extract was NOT repeated
  cache: 1 hit, 1 miss

RUN 3: the review prompt changed, so we bump its version
  model calls: review   <- only the changed step reran`,
        },
        {
          type: "note",
          variant: "tip",
          title: "Start with a workflow",
          text: "Write the steps in code first. Upgrade a single step to an agent only when you cannot specify it, for example \"fix whatever is failing\". You keep the predictable parts predictable and the cost of the agent confined to one step.",
        },
        {
          type: "steps",
          title: "Try it",
          items: [
            "Run `04-typed-workflow.ts --fake` twice and compare the cache line.",
            "Run `05-step-cache-demo.ts` and follow which steps are recomputed after the crash and after a version bump.",
            "Add a third step to the workflow with its own schema and version.",
          ],
        },
        {
          type: "example",
          title: "Real-life example",
          context: "Factories",
          text: "A workflow is an assembly line with skilled workers at some stations. The line decides the order and inspects each part between stations (the schemas); a worker (the model) does the part that needs judgment. A bad part is caught at the next inspection, not at the end of the line.",
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Anthropic: Building effective agents", url: "https://www.anthropic.com/engineering/building-effective-agents" },
            { title: "Structured outputs", url: "https://platform.claude.com/docs/en/build-with-claude/structured-outputs" },
          ],
        },
      ],
    },

    // ───────────────────────── 7.5 ─────────────────────────
    {
      slug: "capstone",
      title: "7.5 Capstone: build your own minimal harness",
      description: "Under 500 lines. Then measure it against Pi.",
      blocks: [
        {
          type: "section",
          title: "What you are building",
          body: [
            "A complete working harness in `examples/level-7/capstone/src/`: 488 lines of TypeScript across eleven small files, depending only on the Anthropic SDK, plus one example skill in `capstone/skills/`. It has the seven subsystems from lesson 7.1 in their smallest useful form. A scripted fake model drives 26 acceptance tests, so you can build and verify each milestone without an API key.",
            "Read the reference, then rebuild it milestone by milestone, running only that milestone's tests as you go. Or read it, change it, and break it on purpose. Either way the goal is the same as the paper's minimum viable harness: see that the loop is small and the value is in the pieces around it.",
          ],
        },
        {
          type: "table",
          title: "Milestones",
          headers: ["#", "Feature", "Acceptance check (in `capstone/tests/milestones.test.ts`)", "From"],
          rows: [
            ["M1", "Loop: tool call, result, final answer; turn cap; tool errors become results", "Loop ends, a runaway agent is stopped, an unknown tool does not crash it; a `max_tokens` or `refusal` reply is not counted as finished, and `pause_turn` continues", "Level 1, 5"],
            ["M2", "Tools: read, write, edit, bash, confined to the project folder", "Truncated reads continue from an offset, no path escapes, `edit` needs a unique match, bash keeps the END of long output", "Level 3"],
            ["M3", "System prompt with `AGENTS.md` / `CLAUDE.md` from root down to cwd", "Outermost first; no files means no section", "Level 2"],
            ["M4", "Compaction with a summary marker", "Short history untouched; recent tail kept, minus its thinking blocks; never cuts between a call and its result; second compaction merges into the first", "Level 2"],
            ["M5", "Hooks: a bash guard and composable before/after hooks", "Dangerous command blocked before it runs and the model told why; first block wins", "Level 4"],
            ["M6", "Skills: descriptions in the prompt, body loaded on demand; one real skill, `fix-failing-test`", "Invalid skills skipped; only descriptions advertised", "Level 3"],
            ["M7", "Subagent with fewer powers and its own context", "Its file reads stay out of the main context; thin briefs rejected", "Level 5"],
            ["M8", "Tracing to JSONL", "Every model call and tool call is a line, using the same field names as Level 6's trace (so its summarizer and analyzer can read it). Subagent calls are not traced", "Level 6"],
            ["M9", "End to end", "Instructions, a skill, an edit, a blocked command, compaction across two tasks, and a trace together", "All"],
          ],
        },
        {
          type: "code",
          language: "bash",
          filename: "terminal",
          code: `node --test examples/level-7/capstone/tests/*.test.ts     # 26 tests, no API key
bun run examples/level-7/capstone/src/cli.ts "add a test for slugify" --root . --trace run.jsonl --skills examples/level-7/capstone/skills`,
        },
        { type: "code", language: "ts", filename: "examples/level-7/capstone/src/loop.ts", code: capLoop },
        {
          type: "section",
          title: "The wiring",
          body: ["`createHarness` is the whole composition: tools, prompt, optional skills, optional subagent, hooks (the built-in bash guard first, then yours, then tracing) and optional compaction. History lives in the harness, so several `run()` calls continue one conversation."],
        },
        { type: "code", language: "ts", filename: "examples/level-7/capstone/src/harness.ts", code: capHarness },
        {
          type: "section",
          title: "Benchmark it against Pi",
          body: [
            "`bench.ts` runs the Level 6 golden tasks on your harness and, with `--pi`, on Pi, using the same prompts, trial counts and statistics. Both get bash, so the sentence in the golden prompts telling the agent it cannot run the tests is replaced for both. Pi runs with `--mode json --no-session --no-approve`, context files, extensions, skills and MCP turned off, and four tools, so the comparison is about the loop and prompt rather than extras. (The capstone keeps its one skill; turn it off by removing `skillsDir` if you want the strictest comparison.)",
            "Both run `claude-opus-5-5`: the capstone through its `Caller`, Pi through `--model anthropic/claude-opus-5-5`. The table reports pass rate, tokens, cost and turns per trial for both: the capstone's from its trace hooks, Pi's from the usage in its JSON event stream. Every trial's transcript is kept, and the script prints the folder. Cost is tasks × trials × variants agent runs, so start with `--limit 3 --trials 2`.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-7/capstone/bench.ts", code: capBench },
        {
          type: "code",
          language: "bash",
          filename: "terminal",
          code: `bun run examples/level-7/capstone/bench.ts --limit 3 --trials 2
bun run examples/level-7/capstone/bench.ts --pi --limit 3 --trials 2`,
        },
        {
          type: "section",
          title: "Write it up",
          body: [
            "Finish with a one-page note. A result you can explain is worth more than a score. Use the template below, and fill every heading from your own numbers and transcripts, not from memory.",
          ],
        },
        {
          type: "code",
          language: "markdown",
          filename: "WRITEUP.md",
          code: `# Capstone write-up
## Setup
Model, effort, tasks, trials per task, date. Exact bench command.
## Results
Pass rate with interval, tokens, $ and turns per trial, for both harnesses. The p-value from the stratified test.
## What mattered
The milestone or change that moved the pass rate most, with the before/after numbers that show it.
## What did not
Changes you expected to help that measured as noise.
## Failures I read
Two or three failing transcripts: the turn where it went wrong, and the root cause (lesson 6.3's taxonomy).
## Next
The one change you would make next, and the result you predict for it.`,
        },
        {
          type: "note",
          variant: "warning",
          title: "Warning",
          text: "Compaction keeps a recent tail, and current models attach thinking blocks to replies. Those blocks are tied to the full history they were made with, so `compaction.ts` drops them from the kept tail; replaying them after a summary is rejected. Keep that line if you rewrite compaction.",
        },
        {
          type: "note",
          variant: "info",
          title: "Info",
          text: "Expect Pi to beat a few hundred lines on harder tasks, and to tie on easy ones. Neither result is the point. The point is knowing exactly why, from your own traces and numbers: that is harness engineering.",
        },
        {
          type: "example",
          title: "Real-life example",
          context: "Learning",
          text: "Building the capstone is like writing a small compiler in a compilers course. Nobody ships it, and real compilers are a thousand times bigger. But after you have built one, you read GCC's source differently: you know which part you are looking at and what it must be doing.",
        },
        {
          type: "section",
          title: "Where to go next",
          body: ["Add a held-out task set and run the lesson 7.2 loop on your own harness, with a human on the merge. Add a second provider behind the `Caller` interface. Give the subagent a different model. Each is a small change because the parts are separate."],
          links: [
            { title: "Pi repository", url: "https://github.com/earendil-works/pi" },
            { title: "Harness Engineering paper (arXiv 2609.00006)", url: "https://arxiv.org/abs/2609.00006" },
          ],
        },
      ],
    },
  ],
};
