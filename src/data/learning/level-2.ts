import type { Topic } from "./types.ts";
// Code blocks import the runnable example files, so lesson code and examples/ can never drift apart.
import inspectContext from "../../../examples/level-2/01-inspect-context.ts?raw";
import manualCompaction from "../../../examples/level-2/02-manual-compaction.ts?raw";
import onDemandCompaction from "../../../examples/level-2/03-on-demand-compaction.ts?raw";
import thresholdCompaction from "../../../examples/level-2/04-threshold-compaction.ts?raw";
import forkHistory from "../../../examples/level-2/05-fork-history.ts?raw";
import fileMemory from "../../../examples/level-2/06-file-memory.ts?raw";
import memoryTool from "../../../examples/level-2/07-memory-tool.ts?raw";
import reviewTemplate from "../../../examples/level-2/08-review-prompt-template.md?raw";

export const level2: Topic = {
  slug: "context-engineering",
  title: "Level 2 — Context Engineering",
  icon: "Layers",
  subTopics: [
    // ───────────────────────── 2.1 ─────────────────────────
    {
      slug: "what-goes-in-the-window",
      title: "2.1 What goes in the window",
      description: "Every token in the window competes for the model's attention. Spend them deliberately.",
      blocks: [
        {
          type: "section",
          title: "Everything is resent every turn",
          body: [
            "From Level 0: the API is stateless, so each request carries the whole context. That context is four things: the system prompt, the tool definitions, the conversation history, and the tool results the agent has collected along the way.",
            "Context engineering is the job of deciding what goes into that window, and what stays out. Harness engineering is mostly context engineering with extra steps.",
          ],
        },
        {
          type: "section",
          title: "Attention is a budget",
          body: [
            "Anthropic describes context as a finite resource with diminishing returns. Models have an \"attention budget\" that every new token draws on. Their stated goal is to find the smallest possible set of high-signal tokens that makes the outcome you want most likely.",
            "The problem has a name, context rot: as the number of tokens in the window grows, the model's ability to recall information from it goes down. Chroma's research tested 18 LLMs and found the same pattern. Models do not use their context uniformly, and performance becomes less reliable as input grows, even on simple tasks.",
          ],
        },
        {
          type: "section",
          title: "The parts of a request",
          body: [
            "A coding harness assembles each request from a few parts. Pi describes it this way: the system prompt comes from its base instructions plus discovered context files, and the request also carries tool definitions and skill descriptions. The active branch of the conversation supplies the history.",
          ],
        },
        {
          type: "table",
          headers: ["Part", "What it holds", "How it grows"],
          rows: [
            ["System prompt", "Identity, rules, environment details", "Small and stable; grows when you add rules"],
            ["Context files", "`AGENTS.md` / `CLAUDE.md` content", "Grows with your project instructions"],
            ["Tool definitions", "Name, description and schema of every tool", "Grows with every tool you enable, and is sent every turn"],
            ["Skill descriptions", "One line per skill; bodies load on demand", "Grows slowly with the number of skills"],
            ["History", "Your messages and the model's replies", "Grows every turn"],
            ["Tool results", "File contents, command output, search hits", "Usually the biggest and fastest-growing part"],
          ],
        },
        {
          type: "section",
          title: "Measure it",
          body: [
            "You cannot manage a budget you cannot see. `countTokens` prices a request without running the model, so you can measure each part separately. The example builds a small request and prints how many tokens each part uses.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-2/01-inspect-context.ts", code: inspectContext },
        {
          type: "note",
          variant: "tip",
          title: "Tip",
          text: "Tool definitions count on every single turn. Ten tools the agent never uses are a tax on every request.",
        },
        {
          type: "section",
          title: "Retrieve just in time",
          body: [
            "The naive approach is to preload everything that might be useful. The better one, in Anthropic's words, keeps lightweight identifiers (file paths, stored queries, links) and loads the real content at runtime through tools. Give the agent `grep` and `read` instead of pasting the repository into the prompt.",
            "The cost of this approach is slower, more exploratory work. The benefit is that the window holds what the task needs now.",
          ],
        },
        {
          type: "example",
          title: "Real-life example",
          context: "React",
          text: "This is lazy-loading routes. You do not ship every page in the first bundle; you ship a small shell and load each route when the user opens it. Preloading a whole repository into the prompt is the same mistake as bundling the whole app up front.",
        },
        {
          type: "section",
          title: "Progressive disclosure",
          body: [
            "Skills apply the same idea to instructions. Pi sends only a short description of each skill in every request and loads the full instructions on demand, when the model decides a skill is relevant. Level 3 builds one.",
          ],
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Effective context engineering for AI agents, Anthropic Engineering", url: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents" },
            { title: "Context Rot, Chroma Research", url: "https://research.trychroma.com/context-rot" },
            { title: "Token counting", url: "https://platform.claude.com/docs/en/build-with-claude/token-counting" },
            { title: "How Pi works (context assembly)", url: "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/how-pi-works.md" },
          ],
        },
      ],
    },

    // ───────────────────────── 2.2 ─────────────────────────
    {
      slug: "compaction",
      title: "2.2 Context rot and compaction",
      description: "Long sessions get worse before they hit the limit. Compaction resets the slope.",
      blocks: [
        {
          type: "section",
          title: "Rot comes before the limit",
          body: [
            "A session does not fail only when the window is full. It degrades earlier: stale file contents the agent read an hour ago, plans it abandoned, and long command output all dilute attention. The model has more to read and less that matters.",
            "There are two ways to shrink a full context. Summarize it (compaction), or delete parts of it (context editing). This lesson covers both.",
          ],
        },
        {
          type: "section",
          title: "Compaction: summarize and restart",
          body: [
            "Compaction takes a conversation nearing its limit, summarizes it, and starts a new window from the summary. Anthropic calls it the first lever of context engineering. The hard part is choosing what to keep: overly aggressive compaction can drop a detail whose importance only shows up later.",
            "Pi's summaries show what a good one contains: Goal, Constraints and Preferences, Progress (done, in progress, blocked), Key Decisions, Next Steps, and Critical Context. The example below does it by hand with a prompt asking for similar headings, and keeps the last question and answer word for word.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-2/02-manual-compaction.ts", code: manualCompaction },
        {
          type: "section",
          title: "Claude's server-side compaction",
          body: [
            "The Claude API can write the summary for you. There are two beta modes, and Anthropic recommends on-demand wherever it is available.",
          ],
        },
        {
          type: "table",
          headers: ["", "On demand", "At a token threshold"],
          rows: [
            ["Who decides when", "You, by sending a compaction request", "The API, when input tokens reach a trigger (default 150,000)"],
            ["Code you write", "A loop that requests the summary and swaps it in", "One extra parameter on your normal request"],
            ["How you ask", "Top-level `compaction: { type: \"summarize\" }`", "`context_management.edits: [{ type: \"compact_20260112\" }]`"],
            ["Beta header", "`compact-2026-09-04`", "`compact-2026-01-12`"],
            ["Choose it when", "You need to control the timing, or keep recent turns word for word", "You want the API to manage it with minimal code"],
          ],
        },
        {
          type: "section",
          title: "On demand",
          body: [
            "You send the conversation with `compaction: { type: \"summarize\" }`. No reply is written. The response holds one `compaction` block and `stop_reason: \"compaction\"`. From then on that block replaces every message it summarized, and goes first in `messages`.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-2/03-on-demand-compaction.ts", code: onDemandCompaction },
        {
          type: "note",
          variant: "danger",
          title: "Danger",
          text: "Two mistakes raise no error. If summarized messages remain after the block, the API sends them again. If a later request leaves the block out, Claude gets no summary at all. Keep the block exactly as returned, because it is signed.",
        },
        {
          type: "section",
          title: "At a token threshold",
          body: [
            "Add a `compact_20260112` edit to `context_management.edits` and the API compacts by itself when input reaches the trigger. You then append the full `response.content` to your history, not just the text, so the compaction block comes back next turn.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-2/04-threshold-compaction.ts", code: thresholdCompaction },
        {
          type: "section",
          title: "Context editing: delete instead of summarize",
          body: [
            "Compaction summarizes. Context editing removes. The `clear_tool_uses_20250919` strategy (beta `context-management-2025-06-27`) clears the oldest tool results once the conversation passes a threshold. It runs server-side before the prompt reaches Claude, and the response reports what it removed in `context_management.applied_edits`.",
            "Use it for tool-heavy agents whose old results are rarely needed again. This snippet shows the knobs; it is a config shape, not a standalone program.",
          ],
        },
        {
          type: "code",
          language: "ts",
          filename: "snippet",
          code: `// betas: ["context-management-2025-06-27"]
context_management: {
  edits: [
    {
      type: "clear_tool_uses_20250919",
      trigger: { type: "input_tokens", value: 30000 }, // start clearing past 30K input tokens
      keep: { type: "tool_uses", value: 3 }, // keep the 3 most recent tool results
      clear_at_least: { type: "input_tokens", value: 5000 }, // not worth clearing less than this
      exclude_tools: ["web_search"], // never clear results from these tools
    },
  ],
},`,
        },
        {
          type: "note",
          variant: "warning",
          title: "Warning",
          text: "Clearing tool results changes the prompt prefix, which invalidates the prompt cache from that point. That is why `clear_at_least` exists: clear enough to make losing the cache worth it.",
        },
        {
          type: "table",
          headers: ["", "Compaction", "Context editing"],
          rows: [
            ["What it does", "Replaces old turns with a summary", "Removes old tool results (or thinking blocks)"],
            ["Information kept", "The gist, in the model's words", "Nothing from the removed results"],
            ["Best for", "Long conversations", "Tool-heavy agents with bulky, disposable output"],
          ],
        },
        {
          type: "section",
          title: "Compaction in Pi",
          body: [
            "Pi compacts automatically when the context passes the window size minus a reserve: `contextTokens > contextWindow - reserveTokens`. The reserve defaults to 16,384 tokens. It keeps the most recent turns (about 20,000 tokens by default) word for word and summarizes everything before them. Run `/compact` to do it yourself, optionally with instructions such as `/compact keep the database decisions`.",
            "Compaction does not delete anything. Pi appends a summary entry to the session and builds the next request from the summary plus the kept messages, while the original entries stay in the session file.",
          ],
        },
        {
          type: "code",
          language: "json",
          filename: "~/.pi/agent/settings.json",
          code: `{
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}`,
        },
        {
          type: "section",
          title: "Checkpoints",
          body: [
            "A summary lives inside one session. For work that must survive a new session, write progress to a file the next session reads: what is done, what is next, what you decided. A short `PROGRESS.md` mentioned in `AGENTS.md` is enough. Level 5 turns this into a long-running agent.",
          ],
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Compaction overview, Claude docs", url: "https://platform.claude.com/docs/en/build-with-claude/compaction" },
            { title: "Compaction on demand", url: "https://platform.claude.com/docs/en/build-with-claude/compaction-on-demand" },
            { title: "Compaction at a token threshold", url: "https://platform.claude.com/docs/en/build-with-claude/compaction-threshold" },
            { title: "Context editing", url: "https://platform.claude.com/docs/en/build-with-claude/context-editing" },
            { title: "Pi compaction reference", url: "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/compaction.md" },
            { title: "Context Rot, Chroma Research", url: "https://research.trychroma.com/context-rot" },
          ],
        },
      ],
    },

    // ───────────────────────── 2.3 ─────────────────────────
    {
      slug: "session-trees",
      title: "2.3 Session trees and branching",
      description: "Try three approaches without polluting one conversation.",
      blocks: [
        {
          type: "section",
          title: "Why branch",
          body: [
            "Exploring alternatives in one straight conversation leaves every dead end in the context. By the time you pick an approach, the window is full of the ones you rejected.",
            "Pi stores a session as a tree of entries, so going back to an earlier point does not erase the branch you left. The model sees only the active branch.",
          ],
        },
        {
          type: "table",
          headers: ["Command", "Result", "Use it when"],
          rows: [
            ["`/tree`", "Moves within the current session file", "Related alternatives should stay together"],
            ["`/fork`", "Creates a new session from an earlier user message", "The alternative should become separate work"],
            ["`/clone`", "Copies the active branch into a new session", "You want a separate copy of the current state"],
          ],
        },
        {
          type: "steps",
          title: "Branch with /tree",
          items: [
            "Type `/tree`, or press `Escape` twice with an empty editor, to open the session tree.",
            "Select an earlier user message. Its text goes back into the editor.",
            "Edit it and submit. This starts a new branch from that point.",
            "Use `/tree` again to move between branches. Nothing is deleted.",
          ],
        },
        {
          type: "section",
          title: "Branch summaries",
          body: [
            "When you leave a branch, Pi can summarize it and attach the summary to the branch you move to. You keep what the abandoned path learned without carrying every message of it.",
          ],
        },
        {
          type: "section",
          title: "Forking in code",
          body: [
            "A conversation is an array, so forking is copying it. `structuredClone` gives each branch its own history. The two continuations below start from the same trunk and never see each other.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-2/05-fork-history.ts", code: forkHistory },
        {
          type: "section",
          title: "Bring the result back",
          body: [
            "When one branch wins, carry back a short decision, not the whole branch. A sentence such as \"we chose Redis because of X\" gives the main line what it needs without the other 40 messages.",
          ],
        },
        {
          type: "note",
          variant: "tip",
          title: "Tip",
          text: "Branches that share a long prefix can also share prompt-cache hits, because caching matches on the prefix. Very short prefixes fall under the minimum cacheable size and get no benefit.",
        },
        {
          type: "example",
          title: "Real-life example",
          context: "Git",
          text: "It is `git branch`. You try an idea on a branch, merge the winner, and delete the rest. You would not try three refactors by committing all of them to main and reverting two.",
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Pi: sessions and context", url: "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sessions.md" },
            { title: "Pi compaction reference (branch summarization)", url: "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/compaction.md" },
            { title: "Prompt caching", url: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching" },
          ],
        },
      ],
    },

    // ───────────────────────── 2.4 ─────────────────────────
    {
      slug: "memory",
      title: "2.4 Memory",
      description: "The model forgets. Your harness remembers on its behalf.",
      blocks: [
        {
          type: "section",
          title: "Three kinds of memory",
          body: [
            "A model has no memory between requests. Anything that feels like memory is a layer your harness adds, and each layer has a different lifetime and a different cost.",
          ],
        },
        {
          type: "table",
          headers: ["Tier", "Where it lives", "Lifetime", "Cost"],
          rows: [
            ["Short-term", "The context window (history)", "One session, shrinks when compacted", "Tokens on every turn"],
            ["Session files", "The saved session (Pi keeps them under `~/.pi/agent/sessions/`)", "Until you delete them; resume with `/resume`", "Nothing until you resume"],
            ["Long-term notes", "Files you or the agent write: `AGENTS.md`, a memory folder", "Across sessions and projects", "Nothing until loaded"],
          ],
        },
        {
          type: "section",
          title: "The file-based pattern",
          body: [
            "The simplest durable memory is a folder of small files. One fact per file, plus an index file with one line per fact. The index goes into the system prompt at the start of every session, so the model knows what it knows. The full text of a fact is read only when needed.",
            "This is progressive disclosure again: a cheap index always in context, the expensive detail on demand. Anthropic lists structured note-taking, where the agent writes notes outside the context window and pulls them back later, as one of the main techniques for long tasks.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-2/06-file-memory.ts", code: fileMemory },
        {
          type: "note",
          variant: "warning",
          title: "Warning",
          text: "Never build a file path from raw model output. The example restricts names to `[a-z0-9-]` before they touch the filesystem.",
        },
        {
          type: "section",
          title: "Claude's memory tool",
          body: [
            "The API has this pattern built in. You declare `{ type: \"memory_20250818\", name: \"memory\" }`. Claude then checks a `/memories` directory before starting a task and writes there as it learns. The tool is client-side: Claude only asks for operations, and your code runs them against storage you control.",
            "Your handler must reject any path outside `/memories`. The TypeScript SDK ships a helper (`betaMemoryTool`) and a local-filesystem backend that do this for you.",
          ],
        },
        { type: "code", language: "ts", filename: "examples/level-2/07-memory-tool.ts", code: memoryTool },
        {
          type: "section",
          title: "Memory hygiene",
          body: [
            "Memory that is never cleaned becomes a liability. Overwrite by name so you do not accumulate duplicates, as the example does. Expire facts that were only true for a while. And verify before acting: a remembered file path may no longer exist, and a remembered preference may have changed.",
          ],
        },
        {
          type: "note",
          variant: "warning",
          title: "Warning",
          text: "A memory is a hint written in the past. Treat it as a claim to check, not as a fact.",
        },
        {
          type: "example",
          title: "Real-life example",
          context: "Team",
          text: "A team wiki and a Slack channel are two memory tiers. The wiki is curated long-term memory: small, indexed, kept current. Slack is noisy short-term memory that is fine for today and wrong a year later. Agents need both, and need to know which is which.",
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Memory tool, Claude docs", url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool" },
            { title: "Effective context engineering for AI agents (structured note-taking)", url: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents" },
            { title: "Pi: sessions and context", url: "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sessions.md" },
          ],
        },
      ],
    },

    // ───────────────────────── 2.5 ─────────────────────────
    {
      slug: "prompt-templates",
      title: "2.5 Prompt templates",
      description: "Save the prompts you type every day as one-word commands.",
      blocks: [
        {
          type: "section",
          title: "A prompt, saved as a command",
          body: [
            "A prompt template is a Markdown file that becomes a `/` command. In Pi, a file at `~/.pi/agent/prompts/review.md` is available as `/review`: the filename is the command name. Pi expands the template before the text reaches the agent.",
            "Project templates live in the project's `.pi/prompts/` folder. They load only after you trust the project, so review a template before trusting an unfamiliar repo. Run `/reload` after adding or changing one in an open session.",
          ],
        },
        { type: "code", language: "markdown", filename: "~/.pi/agent/prompts/review.md", code: reviewTemplate },
        {
          type: "section",
          title: "Arguments",
          body: [
            "The `description` shows in command completion, and `argument-hint` documents the arguments (`<required>`, `[optional]`). Arguments follow shell-like quoting, so `/review \"API compatibility\"` passes one argument with a space in it.",
          ],
        },
        {
          type: "table",
          headers: ["Syntax", "Result"],
          rows: [
            ["`$1`, `$2`, …", "One positional argument"],
            ["`$@` or `$ARGUMENTS`", "All arguments joined with spaces"],
            ["`${1:-default}`", "First argument, or a default value"],
            ["`${@:-default}`", "All arguments, or a default value"],
            ["`${@:N}`", "Arguments starting at position N"],
            ["`${@:N:L}`", "L arguments starting at position N"],
          ],
        },
        {
          type: "section",
          title: "Starter templates",
          body: ["Four prompts worth saving on day one. Each is a task you repeat, with the checks you would otherwise forget."],
        },
        {
          type: "table",
          headers: ["Command", "Purpose", "Key instructions"],
          rows: [
            ["`/review`", "Review staged changes", "Look for deleted tests, new `any`, unrelated edits. Do not edit files."],
            ["`/refactor`", "Restructure without changing behavior", "Run the tests before and after. Change one thing per commit."],
            ["`/write-tests`", "Add tests for code", "Cover the failing case first. Show the test output."],
            ["`/plan`", "Plan before coding", "List the files to change and the risks. Wait for approval before editing."],
          ],
        },
        {
          type: "section",
          title: "Template or skill?",
          body: [
            "Pi's docs draw the line clearly: use a template when you want to reuse the same prompt without adding executable behavior or a larger set of supporting instructions. When a task needs a procedure, supporting files or scripts, and should load only when relevant, it is a skill. That is Level 3.",
          ],
        },
        {
          type: "note",
          variant: "tip",
          title: "Tip",
          text: "If you have typed the same instruction three times, make it a template.",
        },
        {
          type: "section",
          title: "Further reading",
          body: [],
          links: [
            { title: "Pi: prompt templates", url: "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/prompt-templates.md" },
            { title: "Pi: slash commands", url: "https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/slash-commands.md" },
          ],
        },
      ],
    },
  ],
};
