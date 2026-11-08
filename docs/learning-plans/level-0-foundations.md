# Level 0 — Foundations

Icon: `GraduationCap` · 4 lessons · Examples: `examples/level-0/`

Goal: learner can call the Claude API from TypeScript, explain tokens and context windows, define a tool, and write a capped agent loop by hand.

---

## 0.1 How LLMs work (just enough)

Description: "An LLM predicts the next token. Everything else is built on that."

| # | Block | Content |
|---|---|---|
| 1 | section | What a model is: function from tokens in to next token out, called in a loop. Text in, text out. Stateless, like a REST endpoint with no session. |
| 2 | section | Tokens: chunks of ~¾ of a word. Billing and limits count tokens, not characters. |
| 3 | code | `01-count-tokens.ts` — `client.messages.countTokens()` on English, JSON, code. Shows code/JSON cost more tokens than prose. |
| 4 | section | Context window: max tokens per request (1M on current Claude), input + history together. Like a request body size limit, except you resend the whole history every call. |
| 5 | code | `02-stateless.ts` — two calls, second has no memory of first. Then fix: send the history array (`Anthropic.MessageParam[]`). |
| 6 | note (tip) | "The API has no memory. 'Memory' is you resending the array." |
| 7 | section | Attention cost and KV cache in plain words: long prompts cost more and run slower; providers cache prompt prefixes. Bridge to prompt caching (6.4). |
| 8 | section | Sampling then and now: temperature/top-p explained as concepts; modern reality. |
| 9 | note (warning) | Current Claude models reject `temperature` / `top_p` / `top_k` with a 400. Depth is controlled by `output_config.effort`. `stop_sequences` remains (verify). |
| 10 | code | `03-effort.ts` — same prompt at `effort: "low"` vs `"high"`, print `usage.output_tokens` for each. |
| 11 | section | Instruction following is probabilistic: same prompt, different output. Never trust model output like a typed function return. |
| 12 | example | "Like a junior dev reading your ticket": usually right, sometimes creative, so you verify. Tag: Team. |
| 13 | table | Model tiers: Haiku 5.5 / Sonnet 5.5 / Opus 5.5 / Fable 5.1 — price per 1M in/out, speed, when to use. |
| 14 | section | Further reading |

Sources:
- [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview.md)
- [Token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting.md)
- [Effort parameter](https://platform.claude.com/docs/en/build-with-claude/effort.md)
- [Pricing](https://platform.claude.com/docs/en/about-claude/pricing.md)
- Andrej Karpathy, "Intro to Large Language Models" talk (verify URL)

---

## 0.2 Tool calling

Description: "The model can't run code. It asks you to, and you send back the result."

| # | Block | Content |
|---|---|---|
| 1 | section | Mental model: a tool is an endpoint you expose to the model. Model writes a "request" (JSON), you execute, you reply with the result. |
| 2 | code | `04-tool-definition.ts` — `get_weather` tool: `name`, `description`, `input_schema` (JSON Schema), `strict: true`. Comment compares it to a Zod schema. |
| 3 | steps | Request with tools → `stop_reason: "tool_use"` → read `tool_use` block → run your function → send `tool_result` with matching `tool_use_id` → model answers. |
| 4 | code | `05-one-tool-round-trip.ts` — full single round trip with SDK types (`Anthropic.ToolUseBlock`, `Anthropic.ToolResultBlockParam`). |
| 5 | note (warning) | Parse tool input as JSON and validate it. Never string-match raw JSON. |
| 6 | section | Parallel tool calls: one reply can request several tools. Run concurrently with `Promise.all`, return all results in one user message. |
| 7 | code | `06-parallel-tools.ts` — weather for 3 cities in parallel. |
| 8 | note (danger) | Splitting results across multiple messages quietly teaches the model to stop calling tools in parallel. |
| 9 | section | Tool choice: `auto` (default) and `none`. |
| 10 | note (warning) | On Opus 5.5, forced `any` / `tool` returns a 400. Use `auto` with a prompt that names the tool, or structured outputs. |
| 11 | section | Structured outputs vs tools: when you just want JSON back, use `output_config.format` / `client.messages.parse()` instead of a fake tool. |
| 12 | code | `07-structured-output.ts` — extract `{ name, email, company }` from an email signature using a Zod schema. |
| 13 | example | "Like OpenAPI for an AI client": the description is your API docs; bad description → bad calls. Tag: API. |
| 14 | section | Further reading |

Sources:
- [Tool use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview.md)
- [Parallel tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use.md)
- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs.md)
- [JSON Schema — Learn](https://json-schema.org/learn)

---

## 0.3 The agent loop

Description: "An agent is a `while` loop around tool calling."

| # | Block | Content |
|---|---|---|
| 1 | section | Observe → think → act → repeat. The whole "agent" is ~30 lines. |
| 2 | code | `08-agent-loop.ts` — manual `while (stop_reason === "tool_use")` loop, two tools (`list_files`, `read_file`, sandboxed to one folder). Agent answers "what does this project do?" |
| 3 | table | `stop_reason` values: `end_turn`, `tool_use`, `max_tokens`, `stop_sequence`, `pause_turn`, `refusal` — and the right reaction to each. |
| 4 | section | Termination: no more tool calls, max-turn cap, token/cost budget. |
| 5 | note (danger) | Always cap turns. Uncapped loop = infinite bill. |
| 6 | section | Streaming: `client.messages.stream()` + event handler + `finalMessage()`. Same idea as server-sent events in Express. |
| 7 | code | `09-streaming.ts` — print tokens as they arrive. |
| 8 | section | Error paths: tool throws (`is_error: true`, don't crash), malformed call, `refusal`, API errors (typed SDK errors: 429 retry vs 400 fix). |
| 9 | code | `10-errors.ts` — typed error chain + tool error returned to the model. |
| 10 | section | Shortcut: SDK Tool Runner (`betaZodTool` + `client.beta.messages.toolRunner`) writes the loop for you. Hand-write it once first. |
| 11 | example | Express middleware chain vs agent loop: request flows through handlers; the model picks the next handler. Tag: Backend. |
| 12 | section | Further reading |

Sources:
- [Create a Message (stop reasons, usage)](https://platform.claude.com/docs/en/api/messages/create.md)
- [Streaming](https://platform.claude.com/docs/en/build-with-claude/streaming.md)
- [Errors](https://platform.claude.com/docs/en/api/errors.md)
- Anthropic, "Building effective agents" (verify URL)

---

## 0.4 Developer prerequisites

Description: "What you already know, plus the gaps harness work exposes."

| # | Block | Content |
|---|---|---|
| 1 | table | Skill / why it matters for harnesses / self-check — TS + Bun, Git, shell pipes, HTTP + OpenAPI, tests. |
| 2 | section | Setup: install Bun, `bun add @anthropic-ai/sdk zod`, set `ANTHROPIC_API_KEY` (or `ant auth login`). |
| 3 | steps | Clone examples → run `01-count-tokens.ts` → see output. |
| 4 | note (danger) | Never commit API keys. Use `.env` (gitignored) and never paste a key into a prompt. |
| 5 | section | Shell fluency: agents live in the terminal. `grep`, `find`, pipes, exit codes; why the agent's `bash` tool output matters. |
| 6 | code | `11-shell-tool.ts` — run `git status` via `Bun.spawn`, return stdout / stderr / exit code as a tool result. Preview of Level 3. |
| 7 | section | Further reading |

Sources:
- [Bun docs](https://bun.sh/docs)
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- [Pro Git](https://git-scm.com/book)
- [The Art of Command Line](https://github.com/jlevy/the-art-of-command-line)

---

## Curriculum fixes (apply to `AI-HARNESS-ENGINEERING.md` on approval)

- 0.1: "Sampling: temperature, top-p" → "Sampling then and now: temperature/top-p removed on current Claude; effort + thinking replace them."
- 0.2: "tool-choice modes (auto / required / none)" → "Tool choice: auto / none; forced choice removed on newest models — use strict schemas or structured outputs."
