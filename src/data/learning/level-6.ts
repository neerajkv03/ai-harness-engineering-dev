import type { Topic } from "./types.ts";
// Code blocks import the runnable example files, so lesson code and examples/ can never drift apart.
import stats from "../../../examples/level-6/lib/stats.ts?raw";
import evalRunner from "../../../examples/level-6/lib/eval.ts?raw";
import goldenTasks from "../../../examples/level-6/lib/golden-tasks.ts?raw";
import runGolden from "../../../examples/level-6/01-golden-tasks.ts?raw";
import noiseDemo from "../../../examples/level-6/02-noise-demo.ts?raw";
import trace from "../../../examples/level-6/lib/trace.ts?raw";
import traceRun from "../../../examples/level-6/03-trace-run.ts?raw";
import piSession from "../../../examples/level-6/lib/pi-session.ts?raw";
import piSessionSummary from "../../../examples/level-6/04-pi-session-summary.ts?raw";
import analyze from "../../../examples/level-6/lib/analyze.ts?raw";
import failedTrace from "../../../examples/level-6/05-failed-trace.ts?raw";
import promptCaching from "../../../examples/level-6/06-prompt-caching.ts?raw";
import pricing from "../../../examples/level-6/lib/pricing.ts?raw";
import costModel from "../../../examples/level-6/07-cost-model.ts?raw";

export const level6: Topic = {
  slug: "evaluation-and-observability",
  title: "Level 6 — Evaluation and Observability",
  icon: "ChartLine",
  subTopics: [
    // ───────────────────────── 6.1 ─────────────────────────
    {
      slug: "measuring",
      title: "6.1 Measuring a harness",
      description: "If you didn't measure it, you didn't improve it.",
      blocks: [
        {
          type: "section",
          title: "Benchmarks and your own tasks",
          body: [
            "Public benchmarks tell you how a harness and a model perform together on a fixed set of tasks. SWE-bench gives an agent real GitHub issues and checks whether its patch passes the project's tests. Terminal-Bench scores agents on terminal tasks, and its site now headlines version 4.0. They are useful for comparing models and harnesses in general.",
            "They cannot tell you how an agent behaves in your repository, with your conventions. For that you need your own tasks. Everything in this lesson is how to build and use them.",
          ],
        },
        {
          type: "section",
          title: "The vocabulary",
          body: [
            "Anthropic's guide to evaluating agents gives the terms most teams now use.",
          ],
        },
        {
          type: "table",
          headers: ["Term", "Meaning"],
          rows: [
            ["Task", "One test with defined inputs and success criteria"],
            ["Trial", "One attempt at a task. Outputs vary between runs, so you run several trials."],
            ["Grader", "Logic that scores some aspect of the agent's performance"],
            ["Transcript (trace, trajectory)", "The complete record of a trial: outputs, tool calls, reasoning, intermediate results"],
            ["Outcome", "The final state of the environment when the trial ends"],
          ],
        },
        {
          type: "section",
          title: "Grade the outcome, not the claim",
          body: [
            "Anthropic's example: a flight-booking agent can say \"Your flight has been booked\" at the end of its transcript, but the outcome is whether a reservation exists in the database. An agent's own report is the least reliable evidence you have. Check the state of the world.",
            "Graders come in three kinds. Code-based graders (string match, running tests, checking files) are fast, cheap and objective. Model-based graders use an LLM against a rubric and handle fuzzy criteria. Human graders are the gold standard and the slowest. For coding agents, start with code-based: your test suite is already a grader.",
          ],
        },
        {
          type: "section",
          title: "Ten golden tasks",
          body: [
            "Anthropic's advice on size: in reality, 20 to 50 simple tasks drawn from real failures is a great start. The set below has ten tiny coding tasks. Eight ask the agent to implement a function so a provided test passes. One is a bug fix, and one is a cleanup with two conditions (behavior preserved and the logs gone).",
            "Look at the two special graders. The bug-fix grader also checks that the test file was not edited, because an agent can \"pass\" by deleting the test. The cleanup grader needs both conditions. Graders that are easy to cheat will be cheated.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-6/lib/golden-tasks.ts", code: goldenTasks },
        {
          type: "note",
          variant: "warning",
          title: "Prove the eval is solvable",
          text: "Anthropic's rule is to write unambiguous tasks with reference solutions. A 0% score can mean a broken task, not a weak agent. The suite's own test checks that every task fails untouched and passes with its reference solution. Run it before you trust a single number.",
        },
        {
          type: "section",
          title: "Run trials in clean rooms",
          body: [
            "The runner gives every trial a brand-new temporary folder and deletes it afterwards. Trials must not share state. Anthropic reports seeing Claude gain an unfair advantage on some tasks by examining the git history left by previous trials. A crash is recorded as a failed trial instead of aborting the run.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-6/lib/eval.ts", code: evalRunner },
        {
          type: "table",
          headers: ["Metric", "What it tells you"],
          rows: [
            ["Pass rate", "Whether it works. The headline number, always with an interval."],
            ["Cost per task", "What it costs to run (6.4). Compare per solved task, not per attempt."],
            ["Tokens per task", "How much context it burns. A rising number often means more rereading or a loop."],
            ["Turns per task", "How directly it works. Many turns for a simple task means it is flailing."],
            ["Wall time", "Whether a person would wait for it"],
          ],
        },
        {
          type: "section",
          title: "An ablation",
          body: [
            "To learn whether a change helped, change one thing and hold everything else fixed. The model, the tools and the tasks stay the same; here only a single instruction in the system prompt differs between variants A and B. That is an ablation. Change two things at once and you cannot say which one mattered.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-6/01-golden-tasks.ts", code: runGolden },
        {
          type: "section",
          title: "Is it a win or noise?",
          body: [
            "Models are not deterministic, so a single run per task is a coin flip. The statistics you need are small. A Wilson interval turns \"8 of 10\" into an honest range (about 49% to 94%). A permutation test asks: if A and B were identical, how often would shuffling the results produce a gap this big?",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-6/lib/stats.ts", code: stats },
        {
          type: "section",
          title: "How noisy is it, really?",
          body: [
            "This simulation removes the guesswork, because the truth is known. It runs 300 fake experiments per row. The numbers below are its actual output.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-6/02-noise-demo.ts", code: noiseDemo },
        {
          type: "code",
          language: "text",
          filename: "output",
          code: `A. A and B are IDENTICAL (both pass 75% of the time). How often does B look 10+ points better by luck?

trials per variant   B looks 10+ points better   test says 'significant'
10                   30%                         1%
50                   13%                         3%
200                  0%                          2%

B. B is REALLY better (85% vs 75%). How often does the test notice?

trials per variant   test says 'significant'
10                   1%
50                   18%
200                  63%

C. Consistency: an agent that passes a task 4 times out of 5 trials.

  pass@1 = 0.80   pass@3 = 1.00   (at least one success in k tries)
  pass^1 = 0.80   pass^3 = 0.40   (ALL k tries succeed)`,
        },
        {
          type: "section",
          title: "What the simulation says",
          body: [
            "With 10 trials per variant, two identical harnesses look 10 or more points apart 30% of the time, purely by luck. Yet a real 10-point improvement is detected only 1% of the time. Small samples both invent wins and hide real ones. Even at 200 trials per variant, a real 10-point gain is noticed only 63% of the time.",
            "The practical rules: run several trials per task, report an interval and not a bare percentage, treat a small gap as unproven, and add tasks until the question is settled. A bigger improvement needs fewer trials to see.",
            "The last block shows a second distinction Anthropic makes. pass@k is the chance of at least one success in k tries. pass^k is the chance that all k succeed. For a tool people run once and rely on, pass^k is the honest number: an agent that passes 4 of 5 trials passes three in a row only 40% of the time.",
          ],
        },
        {
          type: "note",
          variant: "warning",
          title: "Warning",
          text: "Model output varies from run to run. Never call a change a win from one run per task. Use several trials, and check the interval.",
        },
        {
          type: "section",
          title: "Two suites, two jobs",
          body: [
            "Anthropic separates capability evals from regression evals. A capability eval asks what the agent can do well, and should start at a low pass rate, giving you a hill to climb. A regression eval should stay near 100%, and exists to catch breakage when you change something. Run both. Watch for a capability eval saturating: when it is nearly all green, it stops telling you anything and needs harder tasks.",
          ],
        },
        {
          type: "example",
          title: "Real-life example",
          context: "Product",
          text: "This is an A/B test in a web app. You split the traffic, change one variable, and wait for enough users before deciding. Nobody ships a redesign because the first five visitors preferred it. The golden-task run is the same experiment with tasks instead of visitors.",
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Demystifying evals for AI agents, Anthropic Engineering", url: "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents" },
            { title: "SWE-bench", url: "https://www.swebench.com/" },
            { title: "Terminal-Bench", url: "https://www.tbench.ai/" },
          ],
        },
      ],
    },

    // ───────────────────────── 6.2 ─────────────────────────
    {
      slug: "tracing",
      title: "6.2 Tracing and logs",
      description: "A transcript is a stack trace for agent behavior.",
      blocks: [
        {
          type: "section",
          title: "Capture everything",
          body: [
            "A pass rate tells you that something failed. It does not tell you why. For that you need the transcript: every model call and tool call, in order, with arguments, results, timings and token counts. If you run web services, this is request logging and APM, for an agent.",
            "Anthropic's advice for working with evals is blunt: you will not know whether your graders are working unless you read the transcripts and grades from many trials. You cannot read what you did not record.",
          ],
        },
        {
          type: "section",
          title: "A trace logger",
          body: [
            "The tracer wraps the two things that matter. Wrapping the model call records latency, token usage (including cache reads and writes) and why the model stopped. Wrapping each tool records the arguments, how long it took, whether it succeeded, and how large the result was. Errors are logged and then re-thrown unchanged, so tracing never changes behavior. Each event is one JSON line.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-6/lib/trace.ts", code: trace },
        {
          type: "section",
          title: "A traced run",
          body: [
            "A scripted model plays a debugging agent: search, read a file, run the tests, then answer. Run the example yourself, since it needs no API key.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-6/03-trace-run.ts", code: traceRun },
        {
          type: "code",
          language: "text",
          filename: "output",
          code: `turns: 4   tool calls: 3
tokens: 9400 in, 165 out   cost on Claude Opus 5.5: $0.0409
slowest tool: run_checks (301.4 ms)
  search     calls 1  errors 0  total 32 ms
  read_file  calls 1  errors 0  total 121 ms
  run_checks calls 1  errors 1  total 301 ms`,
        },
        {
          type: "note",
          variant: "tip",
          title: "Tip",
          text: "Log `usage` from every response. It is free, and it answers \"where did the money go?\" Total input is `input_tokens` plus `cache_read_input_tokens` plus `cache_creation_input_tokens`.",
        },
        {
          type: "section",
          title: "Pi already traces",
          body: [
            "Pi saves every session as a JSONL file under `~/.pi/agent/sessions/`, one JSON object per line. Entries form a tree through `id` and `parentId`, which is how branching works without new files. The first line is a header. The rest include `message` entries (user, assistant and tool results), `compaction`, `model_change`, `thinking_level_change`, `usage`, `branch_summary` and `context_edit`.",
            "Assistant messages record the model, the stop reason, and usage with a cost breakdown. Tool results record `isError`. That is enough for a summary of what a session cost and where it went wrong, with no instrumentation at all.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-6/lib/pi-session.ts", code: piSession },
        { type: "code", language: "ts", filename: "examples/level-6/04-pi-session-summary.ts", code: piSessionSummary },
        {
          type: "code",
          language: "text",
          filename: "output (on the bundled sample session)",
          code: `models: claude-opus-5-5
messages: 1 from you, 5 from the model   compactions: 1
stop reasons: {"toolUse":4,"stop":1}
tool calls: {"read":1,"bash":2,"edit":1}
tool errors: bash (call_2)

tokens: 4750 input, 315 output, 12500 cache reads, 2800 cache writes
cache reads were 62% of all input tokens
cost: $0.0418`,
        },
        {
          type: "section",
          title: "Replay and share",
          body: [
            "Inside Pi, `/session` shows the current session's file, ID, message count, token usage and cost. `/export` writes it as HTML or JSONL, and `--mode json` streams events as JSONL for a script. Pi can also resume a session, which replays its history.",
          ],
        },
        {
          type: "note",
          variant: "warning",
          title: "Warning",
          text: "Sessions can contain prompts, tool arguments, command output, file contents and any credential that was exposed in the conversation. Review a session before you export or share it, and never paste one into a public issue.",
        },
        {
          type: "section",
          title: "OpenTelemetry",
          body: [
            "If your team already has an observability platform, OpenTelemetry puts agent traces next to everything else. The Claude SDK (in beta) can emit a span for each request it sends and each tool use in its tool runner, and your application's exporter sends them on. This is worth setting up when you already have a backend to receive them. The snippet below uses a console exporter so you can see the spans with no backend at all.",
          ],
        },
        {
          type: "code",
          language: "ts",
          filename: "snippet (from the Claude docs)",
          code: `import Anthropic from "@anthropic-ai/sdk";
import { ConsoleSpanExporter, NodeTracerProvider, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-node";

// Register a tracer provider that prints each span to the console.
const provider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())],
});
provider.register(); // also installs the context manager, so SDK spans nest under your spans

const client = new Anthropic();
const message = await client.messages.create({
  model: "claude-opus-5-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello, Claude" }],
});`,
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Pi: session file format", url: "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/session-format.md" },
            { title: "Pi: message types", url: "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/message-types.md" },
            { title: "Pi: sessions and context", url: "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sessions.md" },
            { title: "OpenTelemetry tracing for the Claude API", url: "https://platform.claude.com/docs/en/manage-claude/opentelemetry" },
            { title: "Set up OpenTelemetry with the Claude SDK", url: "https://platform.claude.com/docs/en/manage-claude/opentelemetry/sdk" },
          ],
        },
      ],
    },

    // ───────────────────────── 6.3 ─────────────────────────
    {
      slug: "failure-analysis",
      title: "6.3 Failure analysis",
      description: "Fix the harness, not the wording of one prompt.",
      blocks: [
        {
          type: "section",
          title: "What a failure is telling you",
          body: [
            "Anthropic's advice for reading transcripts has a useful framing. A failing score can come from the agent, but it can equally come from grading bugs, harness constraints or an ambiguous task. If grading is unfair, valid solutions are penalized, or the harness constrains the model, the eval should be revised. Read before you conclude.",
            "Most agent failures that are not the model's fault trace back to the same place: the agent was given something misleading or was missing something it needed. That makes them harness bugs, and harness bugs get fixed in code.",
          ],
        },
        {
          type: "table",
          headers: ["Failure", "Symptom in the trace", "Typical harness fix"],
          rows: [
            ["Wrong tool", "The call does not fit the goal, or two similar tools are confused", "Merge or rename tools; sharpen descriptions (3.1)"],
            ["Bad context", "The agent acts on stale, truncated or missing information", "Truncation pointers, retrieval, compaction hygiene (2.2, 3.1)"],
            ["Lost goal", "Later steps drift from the original task", "Re-state the goal in the re-entry prompt; shorten sessions (5.3)"],
            ["Premature stop", "Claims done with no check after the last edit", "Gate completion on a real check (5.2)"],
            ["Loop", "The same call with the same arguments, repeatedly", "Loop guard, a better error message (5.3, 3.1)"],
            ["Hallucinated API", "A call to a function, flag or tool that does not exist", "Give it a way to look things up; return the real list on error"],
          ],
        },
        {
          type: "steps",
          title: "Find the root cause",
          items: [
            "Find the first wrong turn, not the last one. The visible failure is usually a consequence.",
            "Ask what the model could see at that moment. Open the exact tool results and context it had.",
            "Ask what was missing or misleading in it.",
            "Fix the thing that produced it: the tool, the context or the rule. Not the prompt wording.",
            "Add a golden task that reproduces the failure, so it cannot come back unnoticed.",
          ],
        },
        {
          type: "section",
          title: "A worked example",
          body: [
            "The task is simple: set `TIMEOUT_MS` in `config.ts` to 60000. The file is longer than the `read_file` tool's size cap, and the setting sits in the part that gets cut off. Two versions of the tool run the same task. One truncates silently. The other says what it cut and how to get the rest.",
            "The tools and the damage to the file are real. The model is a script that behaves the way a typical model does when a tool hides something from it, so the whole cycle (symptom, trace, cause, fix) can run offline.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-6/05-failed-trace.ts", code: failedTrace },
        {
          type: "code",
          language: "text",
          filename: "output",
          code: `=== read_file that truncates SILENTLY ===
agent said:   "Done. I set TIMEOUT_MS to 60000."
file graded:  FAIL (lost exports: MAX_CONNECTIONS, REGION)
trace analysis: [write_after_truncated_read] turn 2
  evidence: read_file(config.ts) returned 6000 chars, exactly the size cap, with no truncation notice, then write_file overwrote the whole file
  look at:  Make truncation visible and give a pointer to the rest (3.1). Prefer an exact-match edit tool over whole-file writes.
trace analysis: [unverified_edit] turn 2
  evidence: the last change (write_file) was never followed by a check

=== read_file that truncates WITH A POINTER ===
agent said:   "Done. TIMEOUT_MS is now 60000 and the checks pass."
file graded:  PASS (ok)
trace analysis: no findings`,
        },
        {
          type: "section",
          title: "Read the diagnosis",
          body: [
            "The agent's answer was equally confident both times. Only the outcome check and the trace told the truth. In the silent version the model saw 6,000 characters, believed that was the whole file, added its line and wrote everything back. The settings after the cap were silently deleted.",
            "The root cause is not the model's wording or a missing \"be careful\" in the prompt. The tool hid information. The fix is in the tool: say that output was truncated and how to continue, and prefer an exact-match edit over a whole-file write. With a pointer, the model keeps reading, makes a surgical edit and runs the check.",
          ],
        },
        {
          type: "section",
          title: "A trace analyzer",
          body: [
            "The analyzer is plain code over the trace. It looks for five patterns: a repeated identical call, the same tool failing twice in a row, a whole-file write after a read that was cut off (marked or silent), an edit never followed by a check, and a run that hit its turn cap. Each finding names where to look first. It is a few heuristics, not magic, and it is tested against both runs above.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-6/lib/analyze.ts", code: analyze },
        {
          type: "note",
          variant: "warning",
          title: "Warning",
          text: "Adding \"IMPORTANT: do not overwrite files you have not fully read\" to the prompt is a patch, not a fix. It asks the model to compensate for a tool that hides information. Check the tool and the context first.",
        },
        {
          type: "section",
          title: "Every fix becomes a test",
          body: [
            "When you fix a failure, write a golden task that reproduces it. Here that is a config file longer than the read cap with the target setting after the cap, graded by whether anything else in the file was lost. That task joins your regression suite from 6.1, and a harness change that reintroduces the bug now fails a test instead of a customer.",
          ],
        },
        {
          type: "section",
          title: "Automating the loop",
          body: [
            "Reading traces by hand does not scale, and researchers are trying to automate it. One 2026 paper describes Agentic Harness Engineering: a closed loop in which every editable harness component has a file-level representation (so edits are explicit and revertible), raw trajectories are distilled into a layered evidence corpus an agent can use, and every edit is paired with a prediction that is checked against the next round's results. Another, Harness-R1, trains a dedicated model to turn batches of agent failures into validated patches, using fresh reruns of the unchanged agent as the reward signal.",
            "Both depend on exactly what this lesson builds: traces, outcome-graded tasks and a way to rerun them. Level 7 returns to this.",
          ],
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Demystifying evals for AI agents, Anthropic Engineering", url: "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents" },
            { title: "Agentic Harness Engineering (arXiv 2604.25850)", url: "https://arxiv.org/abs/2604.25850" },
            { title: "Harness-R1 (arXiv 2608.02276)", url: "https://arxiv.org/abs/2608.02276" },
          ],
        },
      ],
    },

    // ───────────────────────── 6.4 ─────────────────────────
    {
      slug: "cost-engineering",
      title: "6.4 Cost engineering",
      description: "Cheaper per task, not just cheaper per request.",
      blocks: [
        {
          type: "section",
          title: "Cost per completed task",
          body: [
            "Anthropic's guidance is to compare models on cost per completed task, not per token, because you pay for completed tasks. A failed task still bills its tokens, then the retry, then whatever the failure costs downstream. And price the tail: on one 20-problem search run, two problems carried 43% of the spend.",
            "Cost is arithmetic, so do the arithmetic first. This module turns the `usage` numbers an API response reports into dollars, using the prices below. `input` means uncached input tokens only, exactly as the API reports them.",
          ],
        },
        {
          type: "table",
          headers: ["Model", "Input", "Cache write (5 min)", "Cache write (1 hour)", "Cache read", "Output"],
          rows: [
            ["Claude Fable 5.1", "$10", "$12.50", "$20", "$0.25", "$50"],
            ["Claude Opus 5.5", "$4", "$5", "$8", "$0.20", "$20"],
            ["Claude Sonnet 5.5", "$2", "$2.50", "$4", "$0.10", "$10"],
            ["Claude Haiku 5.5", "$0.10", "$0.125", "$0.20", "$0.01", "$0.50"],
          ],
        },
        {
          type: "note",
          variant: "info",
          title: "Info",
          text: "Prices are per million tokens. Haiku 5.5 prices apply to prompts up to 100K tokens, and cost more above that. Prices change, so confirm them on the pricing page.",
        },
        { type: "code", language: "ts", filename: "examples/level-6/lib/pricing.ts", code: pricing },
        {
          type: "section",
          title: "Free levers first",
          body: [
            "Anthropic's cost guide puts two levers first because they cost you nothing in quality: prompt caching and trimming unneeded tokens. The Batch API is the next largest free lever for work no one is waiting on. It takes 50% off every token, cached ones included, in exchange for results arriving within 24 hours. Quality-trading levers (effort, model choice) come after.",
          ],
        },
        {
          type: "section",
          title: "Prompt caching",
          body: [
            "The cache is a byte-exact prefix match over the request, in this order: tools, then system prompt, then messages. A change anywhere invalidates everything after it. So keep stable content first, and put anything that varies per request (a timestamp, a request ID, the user's new message) after the last cache breakpoint.",
            "Some facts to build on. The default lifetime is 5 minutes, refreshed on each hit, and a 1-hour lifetime costs 2 times the base input price to write. Prompts shorter than the minimum are processed without caching and with no error: that minimum is 512 tokens on Claude Opus 5.5, Sonnet 5.5, Haiku 5.5 and Fable 5.1, and larger on some older models. You can set up to 4 breakpoints. And a cache entry only becomes available after the first response starts, so concurrent requests do not share a fresh entry.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-6/06-prompt-caching.ts", code: promptCaching },
        {
          type: "note",
          variant: "warning",
          title: "Warning",
          text: "A timestamp or random ID near the top of the prompt silently kills every cache hit. Every request becomes a full-price cache write, with no error. Check `cache_read_input_tokens` after you ship: if it is zero across repeated calls, something at the front is changing.",
        },
        {
          type: "section",
          title: "What caching is worth",
          body: [
            "This model prices one 30-turn agent run: a 20K-token stable prefix, 1,500 more tokens of history each turn, 500 output tokens per turn, every call inside the cache lifetime. The first turn writes the prefix at the write price. Every later turn reads the previous turn's input from cache and writes only the new tokens.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-6/07-cost-model.ts", code: costModel },
        {
          type: "code",
          language: "text",
          filename: "output (part 1)",
          code: `model               no cache     cached    saved
claude-fable-5-1    $13.28       $1.84      86%
claude-opus-5-5     $5.31        $0.86      84%
claude-sonnet-5-5   $2.66        $0.43      84%
claude-haiku-5-5    $0.13        $0.0273    79%

Batch API (results arrive later): another 50% off, e.g. cached Claude Opus 5.5 run: $0.43`,
        },
        {
          type: "section",
          title: "Effort before a second model",
          body: [
            "Anthropic's advice is to sweep effort on your current model before adding another, because most workloads end there. The `effort` parameter governs how much thinking, tool calling and self-verification the model does. Lower effort costs less and is often faster, and how much accuracy it gives up depends on the task.",
            "Their published measurements on Claude Opus 5.5, on a SWE-bench Pro subset, show the shape. Treat them as one directional data point on their own tasks, not a guarantee. The `cost per solved task` column is just cost divided by pass rate.",
          ],
        },
        {
          type: "table",
          headers: ["Effort", "Tasks solved", "Cost per attempt", "Cost per solved task"],
          rows: [
            ["`low`", "87.4%", "$0.11", "$0.13"],
            ["`medium` (default)", "92.8%", "$0.21", "$0.23"],
            ["`high`", "95.3%", "$0.29", "$0.30"],
            ["`xhigh`", "96.7% (a single run)", "$0.74", "$0.77"],
          ],
        },
        {
          type: "section",
          title: "Using the curve",
          body: [
            "Going from high to xhigh buys 1.4 more points of success for about 2.5 times the cost per attempt. Whether that is worth it depends on what a failure costs you, and only your own tasks can tell you. Two cautions from the same guide. Sweep each effort level in a separate session, because changing top-level effort mid-session invalidates the cache and distorts the comparison. And results differ by workload: on some research tasks effort bought a lot, on others little.",
            "When you can check outputs with tests or a verifier, there is a cheaper pattern: run at low effort, then re-run only the failures at high. In Anthropic's tests that came out about 40% cheaper than running everything at high, at the same pass rate. It needs a real check to decide what to re-run, which is exactly what your golden tasks provide.",
          ],
        },
        {
          type: "section",
          title: "Model routing",
          body: [
            "Using a cheap model for easy steps and a strong one for hard steps sounds obviously right, but Anthropic's guidance is to measure first. Tune one model before you add a second. If the effort sweep shows a gap, price the stronger model alone at low effort. Build a pairing only if it beats the single model's whole curve of score against spend.",
            "Where it does pay is delegation (5.1): subagents that do bulk reading or triage can run on a cheaper model while the main agent keeps the stronger one. Haiku 5.5 is the first model to try for high-volume work with outputs you can check.",
          ],
        },
        {
          type: "section",
          title: "Trim what you send",
          body: [
            "Tool-output truncation (3.1) and compaction (2.2) are cost levers as well as quality levers, because every token in the window is resent on every turn. One honest caveat from the same cost guide: context editing, a token-hygiene lever, cost more than it saved on the short run they measured, and changed nothing on the long one. Measure each lever on your own workload before you rely on it.",
          ],
        },
        {
          type: "table",
          headers: ["Lever", "Typical effect", "Quality risk"],
          rows: [
            ["Prompt caching", "Large: about 80% off the total run cost in the model above, when the prefix is stable and calls are close together", "None"],
            ["Batch API", "50% off every token", "None, but results can take up to 24 hours"],
            ["Lower effort", "Varies by task: 87% solved at $0.11 versus 95% at $0.29 in the data above", "Real: sweep it on your tasks"],
            ["Re-run failures at higher effort", "About 40% cheaper than all-high in Anthropic's tests", "Needs a reliable check to pick the failures"],
            ["Model routing", "Measure it: only worth it if it beats one model's whole curve", "Depends on where the cheaper model stalls"],
            ["Truncate outputs, compact", "Fewer tokens resent every turn", "Lost detail; measure it"],
          ],
        },
        {
          type: "code",
          language: "text",
          filename: "output (part 2)",
          code: `effort    solved    cost/attempt   cost/solved task
low       87.4%     $0.11          $0.13
medium    92.8%     $0.21          $0.23
high      95.3%     $0.29          $0.30
xhigh     96.7%     $0.74          $0.77`,
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Optimizing for cost and intelligence, Claude docs", url: "https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence" },
            { title: "Prompt caching, Claude docs", url: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching" },
            { title: "Effort parameter, Claude docs", url: "https://platform.claude.com/docs/en/build-with-claude/effort" },
            { title: "Batch processing, Claude docs", url: "https://platform.claude.com/docs/en/build-with-claude/batch-processing" },
            { title: "Pricing, Claude docs", url: "https://platform.claude.com/docs/en/about-claude/pricing" },
          ],
        },
      ],
    },
  ],
};
