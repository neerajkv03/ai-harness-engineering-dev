import type { Topic } from "./types.ts";
// Code blocks import the runnable example files, so lesson code and examples/ can never drift apart.
import toolSchema from "../../../examples/level-3/01-tool-schema.ts?raw";
import truncatedOutput from "../../../examples/level-3/02-truncated-output.ts?raw";
import httpStatusCore from "../../../examples/level-3/03-pi-extension-http-status/http-status-core.ts?raw";
import httpStatusExtension from "../../../examples/level-3/03-pi-extension-http-status/index.ts?raw";
import httpStatusTest from "../../../examples/level-3/03-pi-extension-http-status/http-status.test.ts?raw";
import mcpServer from "../../../examples/level-3/04-mcp-server.ts?raw";
import toolSearch from "../../../examples/level-3/05-tool-search.ts?raw";
import releaseNotesSkill from "../../../examples/level-3/06-skill/release-notes/SKILL.md?raw";
import changelogFormat from "../../../examples/level-3/06-skill/release-notes/references/changelog-format.md?raw";
import teamPackageJson from "../../../examples/level-3/07-team-pi-package/package.json?raw";

export const level3: Topic = {
  slug: "tools-and-skills",
  title: "Level 3 — Tools and Skills",
  icon: "Wrench",
  subTopics: [
    // ───────────────────────── 3.1 ─────────────────────────
    {
      slug: "tool-design",
      title: "3.1 Tool design",
      description: "A tool is an API whose only client is a model. Design for that client.",
      blocks: [
        {
          type: "section",
          title: "One client: the model",
          body: [
            "You have designed APIs for browsers and other services. A tool is an API whose only client is a language model, and that client behaves differently. It reads your descriptions instead of your docs, it cannot ask a colleague what a field means, and everything you return costs it context.",
            "Good tool design follows from that. Make the tool easy to choose, easy to call correctly, and cheap to read the result of.",
          ],
        },
        {
          type: "section",
          title: "Fewer, sharper tools",
          body: [
            "Anthropic's guidance on writing tools for agents is to consolidate: one tool can handle several related operations (or API calls) under the hood, instead of exposing every step as its own tool. When many tools overlap, the model has to guess between them. Grouping related tools under a common prefix (namespacing) helps when you genuinely have many.",
          ],
        },
        {
          type: "example",
          title: "Vercel removed 80% of its agent's tools",
          context: "Production",
          text: "Vercel replaced most of one agent's specialized tools with a simpler file-system approach and benchmarked both on five representative queries. Success went from 4 of 5 to 5 of 5, average tokens from about 102k to about 61k (37% fewer), and average steps from about 12 to about 7. The old design's worst case ran 724 seconds and 100 steps before failing. It is their own small benchmark, so treat the direction as solid and the exact numbers as one data point.",
        },
        {
          type: "section",
          title: "A good definition",
          body: [
            "Compare the two definitions below. The bad one gives the model nothing to decide with. The good one has a verb-noun name, a description that says when to use it and what comes back, enums instead of free text, an example, defaults stated in the text, and `strict: true` so the input always matches the schema.",
          ],
        },
        {
          type: "table",
          headers: ["Problem", "Bad", "Good"],
          rows: [
            ["Vague name and description", "`search`: \"Searches stuff\"", "`search_orders`: \"Search a customer's orders. Use when the user asks about order status or delivery.\""],
            ["Loose schema", "`status: string`", "`status` as an enum of `pending`, `shipped`, `delivered`, `cancelled`"],
            ["Huge output", "Return all 340 orders", "Return 20, say \"showing 1-20 of 340\", accept a `page` argument"],
            ["Useless error", "`Invalid input`", "`status: expected one of pending, shipped... Example: {\"status\":\"shipped\"}`"],
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-3/01-tool-schema.ts", code: toolSchema },
        {
          type: "section",
          title: "Return what the model can use",
          body: [
            "Anthropic recommends pagination, range selection, filtering or truncation, with sensible defaults, for any tool response that could use a lot of context. A `response_format` parameter with `concise` and `detailed` values lets the model ask for more only when it needs it.",
            "Pi's extension docs go further: tools must truncate their output. Pi's own limit is 50KB (about 10k tokens) or 2,000 lines, whichever comes first. Truncating is only half the job. Say that you truncated, and say how to get the rest. Silent truncation makes the model confidently wrong.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-3/02-truncated-output.ts", code: truncatedOutput },
        {
          type: "note",
          variant: "warning",
          title: "Warning",
          text: "Error messages are prompts. \"Invalid input\" teaches the model nothing. \"`created_after` must match YYYY-MM-DD\" plus an example fixes the next call.",
        },
        {
          type: "section",
          title: "Dangerous tools",
          body: [
            "A tool that changes the world (sends email, deletes a record, charges a card) needs extra care. Common patterns: default to a dry run that reports what would happen, require an explicit confirmation argument for the real action, and accept an idempotency key so a retried call does not run twice. Level 4 adds hooks and permissions that enforce this in code rather than trusting the model.",
          ],
        },
        {
          type: "section",
          title: "Measure your tools",
          body: [
            "Anthropic's advice is to build an evaluation: generate realistic tasks that need your tools, run them programmatically with simple agent loops, and measure success and token use. Then change a description or a schema and measure again. Level 6 builds this.",
          ],
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Writing effective tools for agents, Anthropic Engineering", url: "https://www.anthropic.com/engineering/writing-tools-for-agents" },
            { title: "We removed 80% of our agent's tools, Vercel", url: "https://vercel.com/blog/we-removed-80-percent-of-our-agents-tools" },
            { title: "Tool use overview, Claude docs", url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview" },
            { title: "Strict tool use, Claude docs", url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use" },
          ],
        },
      ],
    },

    // ───────────────────────── 3.2 ─────────────────────────
    {
      slug: "pi-extensions",
      title: "3.2 Writing custom tools in Pi",
      description: "Add a capability to Pi in one TypeScript file.",
      blocks: [
        {
          type: "section",
          title: "Where extensions live",
          body: [
            "A Pi extension is a TypeScript or JavaScript module that exports a function receiving the Pi API. Pi finds extensions in a few places, one level deep.",
          ],
        },
        {
          type: "table",
          headers: ["Location", "Scope"],
          rows: [
            ["`~/.pi/agent/extensions/*.ts`", "Global, single file"],
            ["`~/.pi/agent/extensions/*/index.ts`", "Global, folder with an entry point"],
            ["`.pi/extensions/...`", "Project-local, same layouts; loads only after you trust the project"],
            ["A Pi package, or `extensions` in `settings.json`", "Shared or custom paths (see 3.5)"],
          ],
        },
        {
          type: "note",
          variant: "danger",
          title: "Danger",
          text: "Extensions run with your full system permissions and can execute arbitrary code. Install only code you have read or trust.",
        },
        {
          type: "section",
          title: "Keep the logic separate",
          body: [
            "Put the real work in a plain module with no Pi imports. The example checks whether a URL responds with a `HEAD` request. Because it takes `fetch` as an argument, you can test it without a network, and later reuse it from an MCP server (3.4).",
          ],
        },
        {
          type: "code",
          language: "ts",
          filename: "examples/level-3/03-pi-extension-http-status/http-status-core.ts",
          code: httpStatusCore,
        },
        {
          type: "section",
          title: "Register the tool",
          body: [
            "The extension is a thin wrapper. `pi.registerTool()` takes a name, a description the model reads, a parameter schema, and an `execute` function. Parameters use TypeBox, which produces JSON Schema much as Zod does. `execute` returns `content` (what the model sees) and `details` (structured data for rendering and state). Throwing an error reports a failed tool result to the model, so write messages it can act on.",
          ],
        },
        {
          type: "code",
          language: "ts",
          filename: "examples/level-3/03-pi-extension-http-status/index.ts",
          code: httpStatusExtension,
        },
        {
          type: "table",
          headers: ["Field", "What it does"],
          rows: [
            ["`name`, `description`", "What the model sees and chooses by. Write the description like API documentation."],
            ["`promptSnippet`", "One line in the system prompt's tool list. Without it, a custom tool is left out of that list."],
            ["`promptGuidelines`", "Extra rules in the system prompt while the tool is active. Name the tool in each one."],
            ["`parameters`", "A TypeBox schema. Pi validates arguments against it before `execute` runs."],
            ["`execute`", "Runs the tool. Returns `{ content, details }`; throw to report an error."],
            ["`renderCall`, `renderResult`", "Optional. Control how the call and result look in the terminal, separate from what the model reads."],
          ],
        },
        {
          type: "note",
          variant: "warning",
          title: "Warning",
          text: "Each `promptGuidelines` bullet is added flat to the system prompt. Write \"Use http_status when...\", not \"Use this tool when...\". The model cannot tell which tool \"this\" means.",
        },
        {
          type: "section",
          title: "What Pi validates for you",
          body: [
            "Pi validates tool arguments as JSON Schema and first coerces loosely typed values: a numeric string becomes a number, `\"true\"` becomes `true`, and a single value becomes a one-item array. TypeBox features outside JSON Schema do not apply. For example, `Type.Refine()` checks are not run, so enforce those rules inside `execute`.",
          ],
        },
        {
          type: "section",
          title: "Parallel by default",
          body: [
            "When the model calls several tools in one message, Pi runs them in parallel. If your tool must not run alongside others, set `executionMode: \"sequential\"`. If it edits files, wrap the work in `withFileMutationQueue()` so it cannot overwrite a change made by the built-in `edit` tool in the same turn.",
          ],
        },
        {
          type: "section",
          title: "Test it as a plain function",
          body: [
            "Because the logic is a plain module, you test it like an Express handler without starting the server: pass in a fake `fetch`, call the function, assert on the result. This one uses Node's built-in test runner, which also works under Bun.",
          ],
        },
        {
          type: "code",
          language: "ts",
          filename: "examples/level-3/03-pi-extension-http-status/http-status.test.ts",
          code: httpStatusTest,
        },
        {
          type: "steps",
          title: "Try it in Pi",
          items: [
            "Test the logic: `node --test examples/level-3/03-pi-extension-http-status/http-status.test.ts`.",
            "Load the extension for one run without installing it: `pi -e ./index.ts` from that folder.",
            "Ask Pi: \"Is https://example.com up?\" and check that it calls `http_status` instead of `curl`.",
            "Keep it: copy the folder to `~/.pi/agent/extensions/http-status/`, then run `/reload` in Pi.",
          ],
        },
        {
          type: "note",
          variant: "tip",
          title: "Tip",
          text: "Start from the official examples folder in the Pi repository. Copy one that is close to what you need, then change it.",
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Pi extensions reference", url: "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md" },
            { title: "Pi official extension examples", url: "https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions" },
            { title: "kcosr/pi-extensions", url: "https://github.com/kcosr/pi-extensions" },
            { title: "Node.js test runner", url: "https://nodejs.org/api/test.html" },
            { title: "Bun test runner", url: "https://bun.sh/docs/cli/test" },
          ],
        },
      ],
    },

    // ───────────────────────── 3.3 ─────────────────────────
    {
      slug: "agent-skills",
      title: "3.3 Agent Skills standard",
      description: "A skill is a folder the agent opens only when it needs it.",
      blocks: [
        {
          type: "section",
          title: "What a skill is",
          body: [
            "A skill is a directory with a `SKILL.md` file: instructions, plus optional scripts, references and assets. Pi tells the model each skill's name and description, and loads the full instructions only when the task calls for them. That keeps long procedures out of context until they matter.",
            "Pi's docs give the dividing line: use a skill when a workflow needs more context than a prompt template, but does not need a new executable integration point (that would be an extension).",
          ],
        },
        {
          type: "code",
          language: "text",
          filename: "layout",
          code: `release-notes/
├── SKILL.md                      # frontmatter + the procedure
└── references/
    └── changelog-format.md       # read only when the skill needs it`,
        },
        {
          type: "code",
          language: "markdown",
          filename: "examples/level-3/06-skill/release-notes/SKILL.md",
          code: releaseNotesSkill,
        },
        {
          type: "code",
          language: "markdown",
          filename: "examples/level-3/06-skill/release-notes/references/changelog-format.md",
          code: changelogFormat,
        },
        {
          type: "section",
          title: "Three levels of loading",
          body: [
            "Anthropic describes progressive disclosure as the core design principle of skills. The name and description are the first level: just enough for the model to know when the skill applies. The body of `SKILL.md` is the second level. Linked files such as `references/` are the third, which the model opens only when it needs them.",
          ],
        },
        {
          type: "section",
          title: "The description is the trigger",
          body: [
            "Only the description sits in context, so it decides whether the skill ever runs. Pi's guidance is to say both what the skill does and when it applies. \"Helps with PDFs\" gives the model nothing to route on. The example's description names the task and the phrases that should trigger it.",
          ],
        },
        {
          type: "note",
          variant: "warning",
          title: "Warning",
          text: "A model can fail to load a relevant skill. Force it with `/skill:name` (for example `/skill:release-notes`), and tighten the description if it keeps missing.",
        },
        {
          type: "table",
          headers: ["Frontmatter field", "Purpose"],
          rows: [
            ["`name`", "Lowercase letters, digits and hyphens, at most 64 characters. Match the folder name."],
            ["`description`", "What it does and when to use it. At most 1,024 characters."],
            ["`license`, `compatibility`, `metadata`", "Optional license, environment requirements and extra key-value data"],
            ["`allowed-tools`", "Experimental list of pre-approved tools"],
            ["`disable-model-invocation`", "Hide the skill from automatic selection; run it only with `/skill:name`"],
          ],
        },
        {
          type: "section",
          title: "Portable by design",
          body: [
            "Pi implements the open Agent Skills specification, so a skill folder written for one agent works in others that support the standard. The agentskills.io site lists the adopters. Pi also reads the standard locations `~/.agents/skills/` and `.agents/skills/` in addition to its own.",
          ],
        },
        {
          type: "table",
          headers: ["", "Tool", "Skill", "Prompt template"],
          rows: [
            ["What it is", "Code the model can call", "A folder of instructions and files", "One saved prompt"],
            ["In context", "Definition every turn", "Description every turn, body on demand", "Only when you type the command"],
            ["Runs code?", "Yes", "Can bundle scripts the model runs", "No"],
            ["Choose it when", "The model needs a new capability", "A procedure needs detail but not new code", "You reuse one short prompt"],
          ],
        },
        {
          type: "example",
          title: "Real-life example",
          context: "Ops",
          text: "A skill is a runbook in an ops wiki. Nobody reads every runbook every day. You keep an index of titles and open the one for the incident in front of you. The description is the title; the body is the runbook.",
        },
        {
          type: "steps",
          title: "Try it",
          items: [
            "Copy `release-notes/` to `~/.agents/skills/` (or your project's `.agents/skills/`).",
            "Run `/reload` in Pi so it rescans skills.",
            "In a repo with tags, ask: \"Draft release notes since the last tag.\" Watch Pi read `SKILL.md`, then the reference file.",
            "If it does not trigger on its own, run `/skill:release-notes` and compare.",
          ],
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Pi skills reference", url: "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md" },
            { title: "Agent Skills specification", url: "https://agentskills.io/specification" },
            { title: "Equipping agents for the real world with Agent Skills, Anthropic Engineering", url: "https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills" },
            { title: "Agent Skills overview, Claude docs", url: "https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview" },
            { title: "anthropics/skills", url: "https://github.com/anthropics/skills" },
            { title: "badlogic/pi-skills", url: "https://github.com/badlogic/pi-skills" },
          ],
        },
      ],
    },

    // ───────────────────────── 3.4 ─────────────────────────
    {
      slug: "mcp",
      title: "3.4 MCP (Model Context Protocol)",
      description: "A standard plug for tools. Useful, but every plug costs context.",
      blocks: [
        {
          type: "section",
          title: "What MCP is",
          body: [
            "The Model Context Protocol is a standard for connecting agents to tools and data. A server exposes capabilities such as tools, resources and prompts. A client (Pi, an IDE, Claude) connects, lists them, and calls them. Pi connects to servers over stdio, where it starts the server as a local process, or over streamable HTTP for remote ones.",
            "The value is reuse: write a server once and every MCP-aware agent can use it, instead of rewriting the integration as a Pi extension, a Claude tool and an IDE plugin.",
          ],
        },
        {
          type: "section",
          title: "A small server",
          body: [
            "This is the same `http_status` logic as the extension in 3.2, now as an MCP server. It uses the current v2 TypeScript SDK (`@modelcontextprotocol/server`). Tool failures come back as results with `isError: true`.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-3/04-mcp-server.ts", code: mcpServer },
        {
          type: "note",
          variant: "warning",
          title: "Warning",
          text: "With the stdio transport, stdout is the protocol channel. A stray `console.log` corrupts the stream. Log with `console.error`.",
        },
        {
          type: "steps",
          title: "Connect it to Pi",
          items: [
            "Add the server: `pi mcp add http-status -- bun run examples/level-3/04-mcp-server.ts`.",
            "Check it: `pi mcp list`, or `/mcp` inside a session.",
            "Pi names the tool `mcp__http_status__http_status` (characters other than letters, digits and `_` become `_`). By default MCP tools use `codemode` exposure, so the model reaches them through scripts. To let it call this one directly, add `\"exposure\": \"direct\"` to the server's entry in `mcp.json`, or change it in `/mcp`.",
            "Run `/reload` after editing `mcp.json` outside the session, then ask Pi to check a URL.",
            "Add `--local` to `pi mcp add` to write the server into the project's `.pi/mcp.json` instead of your user config.",
          ],
        },
        {
          type: "code",
          language: "json",
          filename: "~/.pi/agent/mcp.json",
          code: `{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    },
    "docs": {
      "url": "https://example.com/mcp",
      "headers": { "Authorization": "Bearer \${DOCS_TOKEN}" },
      "description": "Search and read the product documentation"
    }
  }
}`,
        },
        {
          type: "section",
          title: "The cost: context",
          body: [
            "Every connected server's tool definitions go into the context window. Claude's docs estimate that a typical multi-server setup (GitHub, Slack, Sentry, Grafana and Splunk) can use about 55k tokens of definitions before any work starts. They also note that the model's ability to pick the right tool degrades once it has more than 30 to 50 tools available.",
            "The Claude API's answer is tool search: mark tools `defer_loading: true`, and give the model a search tool. Only a tool's name is visible up front, and its full definition loads when the model searches for it. Anthropic says this typically cuts definition tokens by over 85%.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-3/05-tool-search.ts", code: toolSearch },
        {
          type: "section",
          title: "How Pi controls it",
          body: [
            "Pi gives each MCP server an exposure setting that decides how the model reaches its tools. This is Pi's answer to the same context problem.",
          ],
        },
        {
          type: "table",
          headers: ["Exposure", "Behavior", "Typical use"],
          rows: [
            ["`codemode` (default)", "Not declared to the model. Reached by `codemode` scripts that search for tools.", "General servers, especially when scripts combine or filter calls"],
            ["`deferred`", "Not declared until the `tool_search` tool loads a match", "Large servers whose tools you want to call directly after finding them"],
            ["`direct`", "Declared like a built-in tool", "Small, frequently used tool sets"],
            ["`hidden`", "Registered but unreachable", "Servers or tools that must stay off"],
          ],
        },
        {
          type: "section",
          title: "Per-tool exposure and big results",
          body: [
            "A server-level `exposure` can be overridden for individual tools with `toolExposure`, using exact names or `*` patterns. For example, make `search_code` direct, keep `get_*` in codemode, and hide `delete_*` entirely. Pi also truncates MCP text results over 20 KB, removing the middle and saving the full text to a temporary file.",
          ],
        },
        {
          type: "note",
          variant: "danger",
          title: "Danger",
          text: "Treat an MCP server like an npm package from a stranger. Its tool descriptions and results are text the model reads, so they can carry instructions. Keep servers that hold credentials in your user config, and load a project's `.pi/mcp.json` only in projects you trust.",
        },
        {
          type: "example",
          title: "Real-life example",
          context: "Security",
          text: "MCP is a USB-C port: one standard plug, so anything fits anything. That convenience is exactly the risk. You would not plug a random cable you found on the street into your laptop, and you should not connect a server you have not looked at to an agent that can run commands.",
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Model Context Protocol", url: "https://modelcontextprotocol.io/" },
            { title: "MCP security best practices", url: "https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices" },
            { title: "MCP TypeScript SDK (v2)", url: "https://github.com/modelcontextprotocol/typescript-sdk" },
            { title: "Pi MCP reference", url: "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/mcp.md" },
            { title: "Tool search tool, Claude docs", url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool" },
            { title: "Advanced tool use, Anthropic Engineering", url: "https://www.anthropic.com/engineering/advanced-tool-use" },
          ],
        },
      ],
    },

    // ───────────────────────── 3.5 ─────────────────────────
    {
      slug: "pi-packages",
      title: "3.5 Pi packages",
      description: "Ship your team's harness setup like any npm package.",
      blocks: [
        {
          type: "section",
          title: "One unit for everything",
          body: [
            "A Pi package bundles extensions, skills, prompt templates and themes so they install, update and version together. It is an ordinary npm package or git repository. Use one when a customization should be shared, or when several resources belong together.",
            "The simplest package uses conventional folders and needs no configuration: `extensions/`, `skills/`, `prompts/` and `themes/`. Pi discovers what is in them.",
          ],
        },
        {
          type: "code",
          language: "text",
          filename: "layout",
          code: `pi-team-setup/
├── package.json
├── extensions/
│   └── http-status/
│       ├── index.ts
│       └── http-status-core.ts
├── skills/
│   └── release-notes/
│       ├── SKILL.md
│       └── references/changelog-format.md
└── prompts/
    └── review.md`,
        },
        {
          type: "section",
          title: "The manifest",
          body: [
            "Add a `pi` key to `package.json` when resources live elsewhere or need filtering. Paths are relative to the package root and accept globs. The `pi-package` keyword makes an npm package eligible for the Pi package gallery.",
            "Declare packages that Pi itself provides (`@earendil-works/pi-coding-agent`, `typebox`, and the other host packages) in `peerDependencies` with `\"*\"`. Do not put them in `dependencies`, because a second copy can break Pi's module mapping and create duplicate registries. Put your own runtime packages in `dependencies`.",
          ],
        },
        { type: "code", language: "json", filename: "examples/level-3/07-team-pi-package/package.json", code: teamPackageJson },
        {
          type: "section",
          title: "Install and manage",
          body: ["Packages install from npm, git, a URL or a local path."],
        },
        {
          type: "table",
          headers: ["Source", "Example"],
          rows: [
            ["npm", "`pi install npm:@acme/pi-team-setup@1.0.0`"],
            ["git", "`pi install git:github.com/acme/pi-team-setup@v1`"],
            ["URL", "`pi install https://github.com/acme/pi-team-setup` (treated as git)"],
            ["Local", "`pi install ./pi-team-setup`"],
          ],
        },
        {
          type: "steps",
          title: "Ship a version",
          items: [
            "Publish the package to npm, or push a git tag such as `v1.0.0`.",
            "Each teammate runs `pi install npm:@acme/pi-team-setup@1.0.0`.",
            "Confirm it loaded with `pi list`.",
            "To release a change, bump the version, publish, and have the team install the new version. Run `pi update --extensions` to reconcile installations.",
            "Try a package for one run without installing it: `pi -e npm:@acme/pi-team-setup`.",
          ],
        },
        {
          type: "section",
          title: "Scope and pinning",
          body: [
            "A normal install is personal and is written to `~/.pi/agent/settings.json`. Add `--local` (or `-l`) to write the declaration to the project's `.pi/settings.json` instead, which Pi reads only after you trust the project. That is how a team shares a setup through the repository.",
            "Versioned npm specifications are pinned, and so are git tags and commits. Pin versions for a team so that everyone runs the same harness. You can also narrow what a package loads, with `[]` for none of a type or `!pattern` to exclude matches:",
          ],
        },
        {
          type: "code",
          language: "json",
          filename: ".pi/settings.json",
          code: `{
  "packages": [
    {
      "source": "npm:@acme/pi-team-setup@1.0.0",
      "extensions": ["extensions/*.ts", "!extensions/legacy.ts"],
      "skills": [],
      "prompts": ["prompts/review.md"]
    }
  ]
}`,
        },
        {
          type: "note",
          variant: "warning",
          title: "Warning",
          text: "Installing a package runs its extension code with your permissions, and its skills can tell the model to run programs. Read the source of third-party packages before you install them, and review a project's package list before you trust the project.",
        },
        {
          type: "example",
          title: "Real-life example",
          context: "Team",
          text: "A shared ESLint config package: one install, and the whole team gets the same rules and the same upgrades. A Pi team package does the same for your agent's tools, skills and prompts, so \"it works on my machine\" stops applying to your harness too.",
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Pi packages reference", url: "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md" },
            { title: "Pi package gallery", url: "https://pi.dev/packages" },
            { title: "Pi extensions reference", url: "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md" },
            { title: "Pi skills reference", url: "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md" },
          ],
        },
      ],
    },
  ],
};
