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
          title: "Map any harness with 60 lines",
          body: [
            "The mapper below scores every file by how densely it uses the vocabulary of each subsystem and prints the top few per subsystem. It is a heuristic, not a parser, so treat the output as a reading list. It skips `node_modules`, `.git`, `target` and similar folders, and skips `dist` or `build` only when a `src` folder sits beside it, so it also works on a package installed from npm.",
          ],
        },
        { type: "code", language: "typescript", filename: "examples/level-7/lib/harness-map.ts", code: harnessMap },
        { type: "code", language: "typescript", filename: "examples/level-7/01-map-a-harness.ts", code: mapDemo },
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
            "Two recent papers study this. \"Agentic Harness Engineering\" (arXiv 2604.25850) treats the harness itself as the thing being optimized from observed runs. \"Harness-R1\" (arXiv 2608.02276) learns harness edits from failure trajectories. Read their abstracts for the method and the reported gains; this lesson builds the part that matters for engineering practice: the guardrails around such a loop.",
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
        { type: "code", language: "typescript", filename: "examples/level-7/lib/evolution.ts", code: evolution },
        { type: "code", language: "typescript", filename: "examples/level-7/02-harness-evolution.ts", code: evolutionDemo },
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
            "Anthropic provides both as server-defined tools. `computer_toolset_20260801` is the screenshot-and-mouse tool. `browser_toolset_20260801` drives a browser through structured page snapshots. In both, your application executes the actions and returns the results; Claude does not control a machine by itself. Check the documentation for the exact type names and required parameters on the model you use, because they change between releases.",
          ],
          links: [
            { title: "Computer use tool", url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool" },
            { title: "Browser use tool", url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/browser-use-tool" },
          ],
        },
        {
          type: "section",
          title: "Build the structured version yourself",
          body: [
            "Playwright 1.65 can return an AI-oriented accessibility snapshot with `page.ariaSnapshot({ mode: \"ai\" })`. Interactive elements carry refs such as `[ref=e12]`, and `page.locator(\"aria-ref=e12\")` acts on exactly that element. That is enough for five tools: `snapshot`, `click`, `fill`, `select`, `navigate`. This is conceptually the same design as Anthropic's browser tool: your app drives the browser and returns an accessibility tree with refs.",
            "Two details matter for safety. `navigate` accepts only hosts on an allow-list. And a catch-all route at the network layer aborts every other host, so a bug in the tool code cannot leak a request. The tool arguments are validated with Zod, and a validation failure is turned into a plain message the model can act on instead of a raw stack.",
          ],
          links: [{ title: "Playwright: aria snapshots", url: "https://playwright.dev/docs/aria-snapshots" }],
        },
        { type: "code", language: "typescript", filename: "examples/level-7/lib/browser-tools.ts", code: browserTools },
        { type: "code", language: "typescript", filename: "examples/level-7/03-browser-agent.ts", code: browserDemo },
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
          title: "A web page is untrusted input",
          text: "Everything on a page, including text a human cannot see, reaches the model. This is the prompt-injection problem from Level 4, with a much larger attack surface. Use an allow-list of hosts, block everything else at the network layer, keep the agent away from logged-in sessions you care about, and tell the model in the system prompt that page content is data. Anthropic's computer-use documentation lists its own security precautions; read them before building on it.",
        },
        {
          type: "example",
          title: "Test automation with a model choosing actions",
          context: "QA",
          text: "Playwright tests break when selectors change. Role-and-name locators (`getByRole(\"button\", { name: \"Subscribe\" })`) are the stable version, and an agent working from the accessibility tree uses the same idea: it finds the control by what it is, not by a CSS path. The cost is that each run is non-deterministic, so use an agent to explore or to write the test once, and keep the committed test deterministic.",
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
            "Each model step returns an object checked by a Zod schema, using structured outputs (`messages.parse` with `zodOutputFormat`). If validation fails, the step retries with the validation error in the prompt, at most twice, then throws a `StepError` naming the step. A bad value stops at the boundary where it was produced instead of surfacing three steps later. The workflow takes a `StepModel` interface, so tests run it with a scripted model and no API key.",
          ],
          links: [{ title: "Structured outputs", url: "https://platform.claude.com/docs/en/build-with-claude/structured-outputs" }],
        },
        { type: "code", language: "typescript", filename: "examples/level-7/lib/workflow.ts", code: workflow },
        { type: "code", language: "typescript", filename: "examples/level-7/04-typed-workflow.ts", code: workflowDemo },
        {
          type: "section",
          title: "Run it offline",
          body: ["`bun run examples/level-7/04-typed-workflow.ts --fake` uses a scripted model. Drop `--fake` to call Claude (needs `ANTHROPIC_API_KEY`)."],
        },
        {
          type: "code",
          language: "text",
          filename: "output (--fake)",
          code: `1. extracted (model, validated by a schema):
 { product: 'billing', severity: 'high', summary: 'Customer was charged twice for the Pro plan.', customerEmail: 'ada@example.com' }

2. routed (plain code, no model):
 { team: 'payments', priority: 1, summary: 'Customer was charged twice for the Pro plan.' }

3. reply (model, validated by a schema):
 { subject: 'About your double charge', body: '...', needsHuman: true }

cache: 2 step(s) served from disk, 0 computed. Run it again: nothing is recomputed.`,
        },
        {
          type: "section",
          title: "Resumable runs",
          body: [
            "A step's result is stored on disk under a key made of a hash of the step name, a version string and its input. If a run dies halfway, running it again skips the finished steps. If you change a step's prompt, bump its version and only that step reruns. Writes use a temporary file and a rename, so a crash cannot leave a half-written entry. The demo kills a run during the review step to show it.",
          ],
        },
        { type: "code", language: "typescript", filename: "examples/level-7/05-step-cache-demo.ts", code: cacheDemo },
        {
          type: "code",
          language: "text",
          filename: "output",
          code: `RUN 1: the process dies during the review step
  model calls: extract, review
  on disk now: extract-538d69b5e92777dd.json

RUN 2: start again, same ticket
  model calls: review   <- extract was NOT repeated

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
            "A complete working harness in `examples/level-7/capstone/src/`: 467 lines of TypeScript across eleven small files, depending only on the Anthropic SDK. It has the seven subsystems from lesson 7.1 in their smallest useful form. A scripted fake model drives 24 acceptance tests, so you can build and verify each milestone without an API key.",
            "Read the reference, then rebuild it milestone by milestone, running only that milestone's tests as you go. Or read it, change it, and break it on purpose. Either way the goal is the same as the paper's minimum viable harness: see that the loop is small and the value is in the pieces around it.",
          ],
        },
        {
          type: "table",
          title: "Milestones",
          headers: ["#", "Feature", "Acceptance check (in `capstone/tests/milestones.test.ts`)", "From"],
          rows: [
            ["M1", "Loop: tool call, result, final answer; turn cap; tool errors become results", "Loop ends, a runaway agent is stopped, an unknown tool does not crash it", "Level 1, 5"],
            ["M2", "Tools: read, write, edit, bash, confined to the project folder", "Truncated reads continue from an offset, no path escapes, `edit` needs a unique match, bash keeps the END of long output", "Level 3"],
            ["M3", "System prompt with `AGENTS.md` / `CLAUDE.md` from root down to cwd", "Outermost first; no files means no section", "Level 2"],
            ["M4", "Compaction with a summary marker", "Short history untouched; recent tail kept; never cuts between a call and its result; second compaction merges into the first", "Level 2"],
            ["M5", "Hooks: a bash guard and composable before/after hooks", "Dangerous command blocked before it runs and the model told why; first block wins", "Level 4"],
            ["M6", "Skills: descriptions in the prompt, body loaded on demand", "Invalid skills skipped; only descriptions advertised", "Level 3"],
            ["M7", "Subagent with fewer powers and its own context", "Its file reads stay out of the main context; thin briefs rejected", "Level 5"],
            ["M8", "Tracing to JSONL", "Every model call and tool call is a line; the file can be summarized by the Level 6 tools", "Level 6"],
            ["M9", "End to end", "Instructions, a skill, an edit, a blocked command, compaction across two tasks, and a trace together", "All"],
          ],
        },
        {
          type: "code",
          language: "bash",
          filename: "terminal",
          code: `node --test examples/level-7/capstone/tests/*.test.ts     # 24 tests, no API key
bun run examples/level-7/capstone/src/cli.ts "add a test for slugify" --trace run.jsonl`,
        },
        { type: "code", language: "typescript", filename: "examples/level-7/capstone/src/loop.ts", code: capLoop },
        {
          type: "section",
          title: "The wiring",
          body: ["`createHarness` is the whole composition: tools, prompt, optional skills, optional subagent, hooks (the built-in bash guard first, then yours, then tracing) and optional compaction. History lives in the harness, so several `run()` calls continue one conversation."],
        },
        { type: "code", language: "typescript", filename: "examples/level-7/capstone/src/harness.ts", code: capHarness },
        {
          type: "section",
          title: "Benchmark it against Pi",
          body: [
            "`bench.ts` runs the Level 6 golden tasks on your harness and, with `--pi`, on Pi, using the same prompts, trial counts and statistics. Both get bash, so the sentence in the golden prompts telling the agent it cannot run the tests is replaced for both. Pi runs with `--print --no-session --no-approve`, context files, extensions, skills and MCP turned off, and four tools, so the comparison is about the loop and prompt rather than extras.",
            "Check that both use the same model. The script pins the capstone to `claude-opus-5-5`; Pi uses its configured default. Cost is tasks × trials × variants agent runs, so start with `--limit 3 --trials 2`.",
          ],
        },
        { type: "code", language: "typescript", filename: "examples/level-7/capstone/bench.ts", code: capBench },
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
            "Finish with a one-page note: which milestone mattered most for the pass rate, which did nothing measurable, what failed in the transcripts you read (lesson 6.3), and what you would change next. A result you can explain is worth more than a score.",
          ],
        },
        {
          type: "note",
          variant: "info",
          title: "Expect to lose at first",
          text: "Pi will probably beat a few hundred lines on harder tasks, and the benchmark may show no measurable difference on easy ones. Neither result is the point. The point is knowing, from your own traces and numbers, exactly why: a missing safeguard, a worse tool description, a weaker prompt. That is harness engineering.",
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
