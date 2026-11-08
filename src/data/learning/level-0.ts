import type { Topic } from "./types.ts";
// Code blocks import the runnable example files, so lesson code and examples/ can never drift apart.
import countTokens from "../../../examples/level-0/01-count-tokens.ts?raw";
import stateless from "../../../examples/level-0/02-stateless.ts?raw";
import effort from "../../../examples/level-0/03-effort.ts?raw";
import toolDefinition from "../../../examples/level-0/04-tool-definition.ts?raw";
import roundTrip from "../../../examples/level-0/05-one-tool-round-trip.ts?raw";
import parallelTools from "../../../examples/level-0/06-parallel-tools.ts?raw";
import structuredOutput from "../../../examples/level-0/07-structured-output.ts?raw";
import agentLoop from "../../../examples/level-0/08-agent-loop.ts?raw";
import streaming from "../../../examples/level-0/09-streaming.ts?raw";
import errors from "../../../examples/level-0/10-errors.ts?raw";
import shellTool from "../../../examples/level-0/11-shell-tool.ts?raw";

export const level0: Topic = {
  slug: "foundations",
  title: "Level 0 — Foundations",
  icon: "GraduationCap",
  subTopics: [
    // ───────────────────────── 0.1 ─────────────────────────
    {
      slug: "how-llms-work",
      title: "0.1 How LLMs work (just enough)",
      description: "An LLM predicts the next token. Everything else is built on that.",
      blocks: [
        {
          type: "section",
          title: "What a model is",
          body: [
            "A large language model is a function. Tokens go in, and the next token comes out. Generating a reply means calling that function in a loop, feeding each new token back in until the model decides to stop.",
            "The model holds no state between calls. If you have built REST APIs, think of an endpoint with no session: everything it needs must arrive in the request.",
          ],
        },
        {
          type: "section",
          title: "Tokens",
          body: [
            "A token is a chunk of text, often part of a word. In English, one token is roughly three quarters of a word. Code, JSON and non-English text usually split into more tokens than plain English prose.",
            "You are billed per token, and every limit (context size, output size) is measured in tokens, not characters. Run the example to see the characters-per-token ratio of three kinds of text.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-0/01-count-tokens.ts", code: countTokens },
        {
          type: "section",
          title: "Context window and statelessness",
          body: [
            "The context window is the maximum number of tokens the model can read in one request: your system prompt, the conversation so far, tool definitions and tool results, plus the reply it is writing. On current Claude Fable 5.1, Opus 5.5 and Sonnet 5.5 models this is 1 million tokens.",
            "Think of it as a request body size limit with one twist: you resend the whole history on every call. The API does not remember your last request. The example below proves it, then fixes it by sending the history array.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-0/02-stateless.ts", code: stateless },
        {
          type: "note",
          variant: "tip",
          title: "Tip",
          text: "The API has no memory. \"Memory\" is you resending the array.",
        },
        {
          type: "section",
          title: "Attention cost and the KV cache",
          body: [
            "To read your prompt the model compares every token with the others (attention). More tokens means more work, so long prompts cost more and respond slower.",
            "Providers speed this up by caching the internal state (the KV cache) of a prompt prefix. A repeated prefix is then cheap to reprocess. This is the idea behind prompt caching, covered in Level 6.",
          ],
        },
        {
          type: "section",
          title: "Sampling: then and now",
          body: [
            "Older APIs let you tune randomness with `temperature` (how adventurous the next-token choice is), `top_p` and `top_k` (how many candidate tokens are considered). You may see them in tutorials.",
            "Current Claude models no longer accept them. Instead, `output_config.effort` (`low` to `max`) controls how hard the model thinks, and `stop_sequences` still lets you cut output at a marker string. Run the example to compare token spend at two effort levels.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-0/03-effort.ts", code: effort },
        {
          type: "note",
          variant: "warning",
          title: "Warning",
          text: "Sending `temperature`, `top_p` or `top_k` to Claude Opus 4.7 or newer returns a 400 error, even at the default value. Remove them from copied code.",
        },
        {
          type: "section",
          title: "Output is probabilistic",
          body: [
            "The same prompt can produce different output on different runs, and the model can be confidently wrong. Never treat a model reply like the typed return value of a function. Validate it, test it, or have a human check it, in proportion to what a mistake would cost.",
          ],
        },
        {
          type: "example",
          title: "Real-life example",
          context: "Team",
          text: "A model is like a capable junior developer reading your ticket. It is usually right and sometimes creative in ways you did not ask for, so you review the pull request before it ships.",
        },
        {
          type: "section",
          title: "Model tiers",
          body: [
            "Anthropic ships several tiers. Pick the cheapest one that does the job, and move up only when quality demands it. Prices are per million tokens (MTok); output costs more than input.",
          ],
        },
        {
          type: "table",
          headers: ["Model", "API id", "Input / Output per MTok", "Use it for"],
          rows: [
            ["Claude Haiku 5.5", "`claude-haiku-5-5`", "$0.10 / $0.50", "High-volume, simple tasks: classification, extraction, triage"],
            ["Claude Sonnet 5.5", "`claude-sonnet-5-5`", "$2 / $10", "Everyday coding and agent work"],
            ["Claude Opus 5.5", "`claude-opus-5-5`", "$4 / $20", "Hard reasoning and long agent runs (used in this course)"],
            ["Claude Fable 5.1", "`claude-fable-5-1`", "$10 / $50", "The most demanding, long-horizon work"],
          ],
        },
        {
          type: "note",
          variant: "info",
          title: "Info",
          text: "Haiku 5.5 prices shown are for prompts up to 100K tokens; longer prompts cost more. Prices change, so confirm on the pricing page.",
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Models overview", url: "https://platform.claude.com/docs/en/about-claude/models/overview" },
            { title: "Token counting", url: "https://platform.claude.com/docs/en/build-with-claude/token-counting" },
            { title: "Effort parameter", url: "https://platform.claude.com/docs/en/build-with-claude/effort" },
            { title: "Pricing", url: "https://platform.claude.com/docs/en/about-claude/pricing" },
            { title: "Intro to Large Language Models, Andrej Karpathy (1 hour talk)", url: "https://www.youtube.com/watch?v=zjkBMFhNj_g" },
          ],
        },
      ],
    },

    // ───────────────────────── 0.2 ─────────────────────────
    {
      slug: "tool-calling",
      title: "0.2 Tool calling",
      description: "The model can't run code. It asks you to, and you send back the result.",
      blocks: [
        {
          type: "section",
          title: "The mental model",
          body: [
            "A tool is an endpoint you expose to the model. The model never executes anything itself. It writes a request (JSON naming a tool and its arguments), you run the real code, and you reply with the result. The model then continues with that result in context.",
          ],
        },
        {
          type: "section",
          title: "Defining a tool",
          body: [
            "A tool definition has a `name`, a `description` and an `input_schema` written in JSON Schema. If you use Zod or Mongoose, it is the same idea: a declared shape for the input.",
            "The `description` is the documentation the model reads to decide when to call the tool. Write it for a reader who has never seen your code. Setting `strict: true` guarantees the model's input matches the schema.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-0/04-tool-definition.ts", code: toolDefinition },
        {
          type: "section",
          title: "The round trip",
          body: ["One tool call is a five-step exchange between your code and the API."],
        },
        {
          type: "steps",
          items: [
            "Send the request with `tools` and the user message.",
            "The reply arrives with `stop_reason: \"tool_use\"` and a `tool_use` block holding the tool name, input and an `id`.",
            "Run your own function with that input.",
            "Send back a `tool_result` block whose `tool_use_id` matches the request's `id`.",
            "The model reads the result and writes the final answer.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-0/05-one-tool-round-trip.ts", code: roundTrip },
        {
          type: "note",
          variant: "warning",
          title: "Warning",
          text: "Validate tool input before using it, exactly as you would validate an Express request body. The example parses it with Zod. Never string-match the raw JSON.",
        },
        {
          type: "section",
          title: "Parallel tool calls",
          body: [
            "One reply can contain several `tool_use` blocks, for example weather in three cities. Run them concurrently with `Promise.all`, then return all results together in a single user message.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-0/06-parallel-tools.ts", code: parallelTools },
        {
          type: "note",
          variant: "danger",
          title: "Danger",
          text: "Do not split results across several user messages. It quietly teaches the model to stop calling tools in parallel.",
        },
        {
          type: "section",
          title: "Tool choice",
          body: [
            "`tool_choice` tells the model how to use tools. `auto` (the default) lets it decide. `none` forbids tool use. Older APIs also had `any` and `tool` to force a call.",
            "On Claude Opus 5.5, Sonnet 5.5 and Fable 5.1 the forced modes are gone. Name the tool in your prompt with `auto`, use `strict: true` for valid arguments, or use structured outputs if the real goal was JSON back.",
          ],
        },
        {
          type: "note",
          variant: "warning",
          title: "Warning",
          text: "Forcing a tool with `tool_choice` `any` or `tool` returns a 400 error on the newest models.",
        },
        {
          type: "section",
          title: "Structured outputs",
          body: [
            "If you only want data back, a tool is the wrong shape. Pass a schema in `output_config.format` and the reply is valid JSON matching it. The SDK's `client.messages.parse()` takes a Zod schema and returns a typed, validated object.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-0/07-structured-output.ts", code: structuredOutput },
        {
          type: "example",
          title: "Real-life example",
          context: "API",
          text: "Tool definitions are like an OpenAPI spec for an AI client. The description is your API documentation. A vague description gets the same result as vague API docs: wrong or missing calls.",
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Tool use overview", url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview" },
            { title: "Parallel tool use", url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use" },
            { title: "Structured outputs", url: "https://platform.claude.com/docs/en/build-with-claude/structured-outputs" },
            { title: "Learn JSON Schema", url: "https://json-schema.org/learn" },
          ],
        },
      ],
    },

    // ───────────────────────── 0.3 ─────────────────────────
    {
      slug: "the-agent-loop",
      title: "0.3 The agent loop",
      description: "An agent is a `while` loop around tool calling.",
      blocks: [
        {
          type: "section",
          title: "Observe, think, act, repeat",
          body: [
            "Put tool calling in a loop and you have an agent. Send the conversation to the model. If it asks for tools, run them, append the results and call again. If it does not, you are done. The whole idea fits in about thirty lines.",
            "The example below gives a model two tools (`list_files` and `read_file`, confined to one folder) and asks it to describe a project. Run it from the repo root.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-0/08-agent-loop.ts", code: agentLoop },
        {
          type: "section",
          title: "Reading stop_reason",
          body: ["Every response says why the model stopped. Your loop decides what to do from that field."],
        },
        {
          type: "table",
          headers: ["stop_reason", "Meaning", "What your loop does"],
          rows: [
            ["`end_turn`", "The model finished its reply", "Stop and show the answer"],
            ["`tool_use`", "The model wants tools run", "Run them, append results, call again"],
            ["`max_tokens`", "Output hit the `max_tokens` limit", "Raise the limit or continue; the answer is cut off"],
            ["`stop_sequence`", "Output hit one of your `stop_sequences`", "Stop, or continue from there"],
            ["`pause_turn`", "A long server-side tool turn paused", "Append the assistant turn and call again"],
            ["`refusal`", "A safety classifier declined the request", "Stop and report; do not retry blindly"],
          ],
        },
        {
          type: "section",
          title: "Termination and limits",
          body: [
            "A loop ends when the model stops asking for tools. That is not enough on its own. Add a maximum turn count, and in production a token or cost budget as well.",
          ],
        },
        {
          type: "note",
          variant: "danger",
          title: "Danger",
          text: "Always cap the number of turns. A loop without a cap is an unbounded bill if the model gets stuck.",
        },
        {
          type: "section",
          title: "Streaming",
          body: [
            "A long reply can take many seconds. `client.messages.stream()` emits text as it is generated, much like server-sent events in Express. Call `finalMessage()` to get the complete message once the stream ends, with `stop_reason` and `usage`.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-0/09-streaming.ts", code: streaming },
        {
          type: "section",
          title: "When things fail",
          body: [
            "There are two different failures. API errors come from the request itself (bad key, unknown model, rate limit); you handle them with the SDK's typed error classes, checking the most specific class first. The SDK already retries connection errors, 408, 409, 429 and 5xx twice by default.",
            "Tool errors are different: your tool threw. Do not crash the loop. Return a `tool_result` with `is_error: true` and a message, and the model can adjust and try again.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-0/10-errors.ts", code: errors },
        {
          type: "section",
          title: "The Tool Runner shortcut",
          body: [
            "The SDK can write this loop for you. `betaZodTool` defines a tool from a Zod schema and a `run` function, and `client.beta.messages.toolRunner()` handles the calls, the results and the stop condition. It is a beta helper in the TypeScript SDK. Write the loop by hand once so you know what it hides.",
          ],
        },
        {
          type: "example",
          title: "Real-life example",
          context: "Backend",
          text: "Compare an Express middleware chain with an agent loop. In Express your code fixes the order of handlers. In an agent the model chooses the next handler (tool) after seeing the last result, and your loop keeps the chain moving.",
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Create a Message API reference", url: "https://platform.claude.com/docs/en/api/messages/create" },
            { title: "Streaming", url: "https://platform.claude.com/docs/en/build-with-claude/streaming" },
            { title: "Errors", url: "https://platform.claude.com/docs/en/api/errors" },
            { title: "Building effective agents, Anthropic Engineering", url: "https://www.anthropic.com/engineering/building-effective-agents" },
          ],
        },
      ],
    },

    // ───────────────────────── 0.4 ─────────────────────────
    {
      slug: "developer-prerequisites",
      title: "0.4 Developer prerequisites",
      description: "What you already know, plus the gaps harness work exposes.",
      blocks: [
        {
          type: "section",
          title: "Skills checklist",
          body: ["You already have most of the toolkit from MEAN and MERN work. A few gaps matter for agent work."],
        },
        {
          type: "table",
          headers: ["Skill", "Why it matters for harnesses", "Self-check"],
          rows: [
            ["TypeScript and Bun", "Examples run with Bun; Pi extensions are TypeScript", "You can run a `.ts` file and read async/await code"],
            ["Git", "Agents change files; git is your undo and review tool", "You can read `git diff` and revert a file"],
            ["Shell and pipes", "Agents live in the terminal; their `bash` tool output is their eyes", "You know `grep`, `find`, pipes and exit codes"],
            ["HTTP and OpenAPI", "Tools are APIs; the SDK is an HTTP client", "You can read an OpenAPI spec and a JSON Schema"],
            ["Tests", "Tests are how an agent proves its work", "You can run a test suite and read a failure"],
          ],
        },
        {
          type: "section",
          title: "Setup",
          body: ["Install Bun, install the dependencies, and give the SDK a key. Then run the first example."],
        },
        {
          type: "steps",
          items: [
            "Install Bun from bun.sh.",
            "In this repo, run `bun install`. It installs `@anthropic-ai/sdk` and `zod`.",
            "Create an API key in the Anthropic Console and put it in your environment as `ANTHROPIC_API_KEY`.",
            "Run `bun run examples/level-0/01-count-tokens.ts` and read the output.",
          ],
        },
        {
          type: "note",
          variant: "danger",
          title: "Danger",
          text: "Never commit an API key. Keep it in the environment or a gitignored `.env`, and never paste it into a prompt.",
        },
        {
          type: "section",
          title: "A first shell tool",
          body: [
            "Almost every coding agent is built around a shell tool. The key detail is the return value: give the model the output, the error output and the exit code, because an exit code of 1 with empty output means something very different from exit code 0.",
            "This example exposes one narrow command (`git status --short`), with no model-chosen arguments reaching the shell. Run it inside a git repository. Level 3 builds on this.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-0/11-shell-tool.ts", code: shellTool },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Bun documentation", url: "https://bun.sh/docs" },
            { title: "Anthropic TypeScript SDK", url: "https://github.com/anthropics/anthropic-sdk-typescript" },
            { title: "Pro Git book", url: "https://git-scm.com/book" },
            { title: "The Art of Command Line", url: "https://github.com/jlevy/the-art-of-command-line" },
          ],
        },
      ],
    },
  ],
};
