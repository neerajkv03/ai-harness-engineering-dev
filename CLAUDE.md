# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is Bun (`devEngines` pins bun 1.4.4). `npm` refuses to run here because of that pin, so use `bun` / `bunx`. Scripts run through the `vp` CLI from Vite+ (`vite-plus`).

- Install: `bun install`
- Dev server: `bun run dev`
- Type-check + production build: `bun run build` (runs `tsc` first, then `vp build`)
- Preview built output: `bun run preview`
- Add a shadcn component: `bunx --bun shadcn@latest add <name>` (writes to `src/components/ui/`)

There is no test runner and no lint/format npm script. Lint and format rules live in `vite.config.ts` (`lint` uses oxlint with type-aware checks; `fmt` is empty). Editor formatting is oxc via `.vscode/settings.json`.

## Architecture

React 19 + TypeScript SPA on Vite, with Tailwind v4 and shadcn/ui components built on Base UI (`@base-ui/react`, shadcn style `base-nova`, configured in `components.json`).

- `index.html` contains only `<div id="app">` and loads `src/main.tsx`.
- `src/main.tsx` mounts `<App />` into `#app` inside `StrictMode`, imports `src/style.css`, and calls `initTheme()` from `src/lib/theme.ts`, which sets the `.dark` class on `<html>` from the saved choice in `localStorage` (default dark). `ThemeToggle` (in the sidebar and top bar) switches and saves it.
- The app is a learning site for the curriculum in `AI-HARNESS-ENGINEERING.md`. **`DESIGN.md` is the source of truth for all UI work**; read it before changing a screen. Per-level content plans live in `docs/learning-plans/`.
- **Content is data, not JSX.** `src/data/learning/level-N.ts` each export one `Topic` (a level) made of `SubTopic` lessons made of `Block`s (types in `types.ts`). `src/data/learning/index.ts` collects every `level-*.ts` with `import.meta.glob`, so adding a level file adds it to the site. Code blocks in lessons import the runnable files in `examples/level-N/` via `?raw`, so lesson code and runnable code cannot drift.
- `examples/` holds the runnable TypeScript examples (own strict `examples/tsconfig.json`, not part of `bun run build`). Type-check them with `bunx tsc -p examples/tsconfig.json`; running most of them needs `ANTHROPIC_API_KEY`. Some run offline (e.g. `level-3/02-truncated-output.ts`, and the `node --test` unit test in `level-3/03-pi-extension-http-status/`). Pi extension entries (`index.ts` in the `level-3/03-pi-extension-*` and `level-4/*pi-*` folders) are excluded from that tsconfig because Pi supplies its imports at runtime; type-check them against `@earendil-works/pi-coding-agent` in a scratch dir. Their logic lives in sibling modules with no Pi imports and `node:test` unit tests (`node --test <file>` or `bun test <file>`), which do run offline. Level 5 goes further: `examples/level-5/lib/` takes the model call as an injected `Caller`, and `fake-model.ts` scripts one, so the orchestration code (`node --test examples/level-5/lib/*.test.ts`) is tested without an API key. Level 6 builds on that: `examples/level-6/lib/` (stats, eval runner, tracer, trace analyzer, Pi session summarizer, golden tasks) imports the Level 5 `Caller`/`runAgent`, so Level 5's `lib/` must stay API-compatible. Level 7 imports both (`examples/level-7/lib/`: harness mapper, harness-evolution loop, Playwright browser tools, typed workflow + step cache), except `examples/level-7/capstone/`, a self-contained 488-line harness (plus one example skill in `capstone/skills/`) with 26 acceptance tests driven by a scripted fake model (`node --test examples/level-7/capstone/tests/*.test.ts`); `capstone/bench.ts` runs the Level 6 golden tasks on it and optionally on Pi. Browser tests skip if no Chrome/Chromium/Edge is found (`BROWSER_PATH` overrides). Example files must run under plain `node file.ts` (type stripping), so avoid enums and constructor parameter properties there.
- `src/components/learning/` is the 3-column learning screen: `LearningLayout` (shell, drawers) wires `TopicSidebar` (left, levels), `SubTopicSidebar` (right, lessons + "On this page"), and `LessonView` (renders blocks via `CodeBlock`, `NoteAlert`, `ExampleCard`, `Inline`). Selection lives in the URL (`?topic=&sub=`) via `src/hooks/use-learning-route.ts`; heading ids and the "On this page" list come from `src/lib/lesson.ts` (`withHeadings`).
- `src/components/ui/` holds shadcn-generated components. They are owned by the repo and edited in place, not imported from a package.
- `src/lib/utils.ts` exports `cn`, the class-merging helper that shadcn components import. `cn` comes from the `cn` npm package.
- `src/style.css` loads Tailwind, `tw-animate-css`, `shadcn/tailwind.css`, and the Geist font. Theme tokens are CSS variables defined there (`cssVariables: true`).
- The `@/` import alias maps to `src/` in both `tsconfig.json` (`paths`) and `vite.config.ts` (`resolve.alias`). Both must stay in sync.
- `src/assets/` and `public/icons.svg` still contain stock Vite template files that nothing references.

Type-checking is strict and covers `src/` only (`tsconfig.json` `include`). It enables `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, and `erasableSyntaxOnly`, so avoid enums, namespaces, and parameter properties. `allowImportingTsExtensions` is on, so relative imports include the extension (e.g. `./App.tsx`).
