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
- **Raw API examples:** Anthropic TypeScript SDK (`@anthropic-ai/sdk`), model `claude-opus-5-5`, needs `ANTHROPIC_API_KEY` or `ant auth login`.
- **Harness examples:** Pi (`@earendil-works/pi-coding-agent`). Pi API names are verified against `pi.dev` docs and the repo's `packages/coding-agent/docs/` before writing.
- **Lesson order:** concept → code → gotcha note → real-life analogy → further reading.
- **Notes:** max 2 per section (DESIGN.md §5.1).
- **Sources:** official docs first, then 1–2 strong secondary sources. Anything marked `(verify)` is fetched and confirmed before the lesson ships. No dead links.
- **Cost:** examples use tiny prompts; each run costs well under $0.01 unless the lesson says otherwise.
