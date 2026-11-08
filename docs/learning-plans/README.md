# Learning Content Plans — AI Harness Engineering

One plan per level of `AI-HARNESS-ENGINEERING.md`. Each plan lists, per lesson (sub-topic): description, ordered content blocks, runnable code files, and sources. Plans are approved one level at a time before lesson data is written.

| Level | Plan | Status |
|---|---|---|
| 0 — Foundations | [level-0-foundations.md](level-0-foundations.md) | Lesson data written (`src/data/learning/level-0.ts`, `examples/level-0/`) |
| 1 — Using a Harness | [level-1-using-a-harness.md](level-1-using-a-harness.md) | Lesson data written and fact-checked (`src/data/learning/level-1.ts`, `examples/level-1/`) |
| 2 — Context Engineering | [level-2-context-engineering.md](level-2-context-engineering.md) | Lesson data written and fact-checked (`src/data/learning/level-2.ts`, `examples/level-2/`) |
| 3 — Tools and Skills | [level-3-tools-and-skills.md](level-3-tools-and-skills.md) | Lesson data written and fact-checked (`src/data/learning/level-3.ts`, `examples/level-3/`) |
| 4 — Control: Hooks, Permissions, Safety | [level-4-control-and-safety.md](level-4-control-and-safety.md) | Lesson data written and fact-checked (`src/data/learning/level-4.ts`, `examples/level-4/`) |
| 5 — Orchestration | [level-5-orchestration.md](level-5-orchestration.md) | Lesson data written and fact-checked (`src/data/learning/level-5.ts`, `examples/level-5/`) |
| 6 — Evaluation and Observability | [level-6-evaluation-and-observability.md](level-6-evaluation-and-observability.md) | Lesson data written and fact-checked (`src/data/learning/level-6.ts`, `examples/level-6/`) |
| 7 — Advanced and Research Frontier | [level-7-advanced.md](level-7-advanced.md) | Lesson data written and fact-checked (`src/data/learning/level-7.ts`, `examples/level-7/`) |

## Ground rules (all levels)

- **Learner:** intermediate TS dev (MEAN/MERN), new to AI. Every concept anchors to something known: REST, Zod/Mongoose schemas, Express middleware, event loop, npm, CI.
- **Lesson data:** `src/data/learning/level-N.ts`, using the block types in `DESIGN.md` §10 (`section`, `code`, `note`, `example`, `table`, `steps`). No lesson text in components.
- **Runnable code:** every code block also exists as `examples/level-N/NN-name.ts`, run with `bun run examples/level-N/NN-name.ts`. Lesson shows the same code with a filename caption.
  - **Exceptions (as built, 2026-11-08):** blocks captioned `snippet`, a config file path or a template name are shapes to copy, not programs, and have no examples file: Pi `settings.json` / `.pi/settings.json` / `mcp.json` (2.2, 3.4, 3.5), the context-editing knobs (2.2), the refund tool schema (3.1), the inject-context + audit-log hook (4.1), the crontab line (5.3), the OTel tracer (6.2), the effort call (6.4), the computer-use loop (7.3), and the `PROGRESS.md` / `WRITEUP.md` templates (2.2, 7.5).
- **Raw API examples:** Anthropic TypeScript SDK (`@anthropic-ai/sdk`), model `claude-opus-5-5`, needs `ANTHROPIC_API_KEY` or `ant auth login`.
- **Harness examples:** Pi (`@earendil-works/pi-coding-agent`). Pi API names are verified against `pi.dev` docs and the repo's `packages/coding-agent/docs/` before writing.
- **Lesson order:** concept → code → gotcha note → real-life analogy → further reading.
- **Notes:** max 2 per section (DESIGN.md §5.1).
- **Sources:** official docs first, then 1–2 strong secondary sources. Anything marked `(verify)` is fetched and confirmed before the lesson ships. No dead links.
- **Cost:** examples use tiny prompts; each run costs well under $0.01 unless the lesson says otherwise.
