# Level 3 — Tools and Skills

Icon: `Wrench` · 5 lessons · Examples: `examples/level-3/`

Goal: learner designs good tools, writes a Pi extension tool, authors a portable skill, understands MCP tradeoffs, and ships a Pi package.

---

## 3.1 Tool design

Description: "A tool is an API whose only client is a model. Design for that client."

| # | Block | Content |
|---|---|---|
| 1 | section | Few, orthogonal, well-described tools beat many overlapping ones. |
| 2 | example | Vercel removed 80% of its agent's tools and got better results. Tag: Production. |
| 3 | table | Bad tool vs good tool, 4 pairs: vague name, loose schema, huge output, no error message. |
| 4 | code | `01-tool-schema.ts` — `search_orders` tool: tight enums, defaults, examples in the description, `strict: true`. |
| 5 | section | Output design: concise, structured, truncated with a pointer ("showing 20 of 340; pass `page: 2`"). |
| 6 | code | `02-truncated-output.ts` — wrap a tool result: cap length, add a continuation hint. |
| 7 | section | Dangerous tools: idempotency keys, `dry_run: true` default, explicit confirmation field. |
| 8 | note (warning) | Error messages are prompts. "Invalid input" teaches nothing; "`date` must be YYYY-MM-DD, got 05/11" fixes the next call. |
| 9 | section | Further reading |

Sources:
- Anthropic, "Writing effective tools for agents" (verify URL)
- [Tool use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview.md)
- [Marmelab — State of harness engineering 2026](https://marmelab.com/blog/2026/09/24/the-state-of-ai-harness-engineering-2026.html)

---

## 3.2 Writing custom tools in Pi

Description: "Add a capability to Pi in one TypeScript file."

| # | Block | Content |
|---|---|---|
| 1 | section | Extension locations: `~/.pi/agent/extensions/`, `.pi/extensions/`, or a Pi package. |
| 2 | code | `.pi/extensions/http-status.ts` — register a tool with schema + handler (exact API from Pi docs/examples; verify). |
| 3 | section | Result formatting: what the model sees vs what the TUI shows (verify Pi supports separate renderers). |
| 4 | section | Test the handler as a plain function first, then wire it in. Same as unit-testing an Express handler without the server. |
| 5 | code | `03-tool-handler.test.ts` — `bun test` on the handler alone. |
| 6 | note (tip) | Start from the official examples folder; copy, then change. |
| 7 | section | Further reading |

Sources:
- [Pi extension examples](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/README.md)
- [kcosr/pi-extensions](https://github.com/kcosr/pi-extensions)
- [Bun test runner](https://bun.sh/docs/cli/test)

---

## 3.3 Agent Skills standard

Description: "A skill is a folder the agent opens only when it needs it."

| # | Block | Content |
|---|---|---|
| 1 | section | Anatomy: `SKILL.md` with frontmatter (`name`, `description`), body = procedure, optional `references/` and scripts. |
| 2 | code | `skills/release-notes/SKILL.md` — skill that drafts release notes from `git log`. Language: markdown. |
| 3 | section | Discovery: only the description sits in context; it is the trigger. The body loads on demand. |
| 4 | note (warning) | A vague description means the skill never fires, or fires on everything. |
| 5 | section | Portability: same folder works in Pi, Claude Code, Codex CLI, Amp, Droid. |
| 6 | table | Skill vs tool vs prompt template: what it is, when it loads, when to choose it. |
| 7 | example | Runbook in an ops wiki: you don't read every runbook daily, only the one for the incident. Tag: Ops. |
| 8 | section | Further reading |

Sources:
- [Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview.md)
- [agentskills.io spec](https://agentskills.io/) (verify)
- [badlogic/pi-skills](https://github.com/badlogic/pi-skills)
- Anthropic, "Equipping agents for the real world with Agent Skills" (verify URL)

---

## 3.4 MCP (Model Context Protocol)

Description: "A standard plug for tools. Useful, but every plug costs context."

| # | Block | Content |
|---|---|---|
| 1 | section | MCP = client/server protocol exposing tools, resources, prompts. Transports: stdio (local process) and streamable HTTP. |
| 2 | code | `04-mcp-server.ts` — minimal MCP server with one tool using `@modelcontextprotocol/sdk` (verify current API). |
| 3 | section | Pi's stance: no MCP in core; add via an extension/adapter when needed (verify current status). |
| 4 | section | Cost: every connected server's tool schemas sit in context every turn. Tool search (`defer_loading`) as a mitigation. |
| 5 | note (danger) | Treat MCP servers like npm packages from strangers: tool poisoning and prompt injection via tool descriptions and outputs are real. |
| 6 | example | MCP as USB-C: one standard plug, but you still don't plug in random cables found on the street. Tag: Security. |
| 7 | section | Further reading |

Sources:
- [MCP specification](https://modelcontextprotocol.io/) (verify)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) (verify)
- [Tool search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool.md)

---

## 3.5 Pi packages

Description: "Ship your team's harness setup like any npm package."

| # | Block | Content |
|---|---|---|
| 1 | section | A Pi package bundles extensions, skills, prompt templates, themes. |
| 2 | code | `package.json` + folder layout for a team package (verify Pi's manifest fields). Language: json. |
| 3 | steps | Build → `pi install <npm-or-git>` (verify) → confirm loaded → bump version. |
| 4 | section | Project vs global installs; pinning versions for a team. |
| 5 | note (warning) | Installing a package runs its code with your permissions. Review before installing. |
| 6 | example | Shared ESLint config package: one install, whole team gets the same rules. Tag: Team. |
| 7 | section | Further reading |

Sources:
- [pi.dev packages](https://pi.dev/packages) (verify)
- Pi docs: packages (verify)

---

## Curriculum fixes

- 3.4: add "Tool search / deferred loading to cut MCP context cost."

---

## As built (deviations from this plan)

- **Pi supports MCP natively now**, so "no MCP in core" was wrong. 3.4 teaches Pi's `mcp.json`, `pi mcp add`, and the four exposure modes (`codemode` default, `deferred`, `direct`, `hidden`) as Pi's answer to MCP context cost, alongside the Claude API's `defer_loading` tool search.
- **MCP TypeScript SDK is v2** (`@modelcontextprotocol/server`, `@modelcontextprotocol/server/stdio`, `zod/v4`). `04-mcp-server.ts` uses it; the package was added to the project's dependencies.
- **Examples as built:** `01-tool-schema.ts`, `02-truncated-output.ts` (runs offline), `03-pi-extension-http-status/` (`http-status-core.ts`, `index.ts`, `http-status.test.ts`), `04-mcp-server.ts`, `05-tool-search.ts` (new), `06-skill/release-notes/` (`SKILL.md` + `references/`), `07-team-pi-package/package.json`.
- **Test runner:** the unit test uses `node:test`, which runs under both `node --test` and `bun test`, so no extra types package is needed.
- **Vercel's "80% of tools" claim** was traced to Vercel's own post (22 Dec 2025). It is a 5-query benchmark, and the lesson says so.
- **Verification done without a model:** `02-truncated-output.ts` run; unit tests pass under node and bun; the MCP server was exercised over stdio JSON-RPC (initialize, tools/list, both error paths, a live call); the Pi extension type-checks against the real `@earendil-works/pi-coding-agent` types; the skill's frontmatter was validated against the spec limits; `package.json` is valid JSON.
- **Not verified:** the Pi extension was not run inside Pi (needs a model), and `01-tool-schema.ts` / `05-tool-search.ts` were type-checked only (no API key).
- `examples/level-3/03-pi-extension-http-status/index.ts` is excluded from `examples/tsconfig.json` because Pi provides its imports at runtime.
