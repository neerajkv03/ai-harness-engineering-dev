# AGENTS.md

## Commands
- Install: `npm ci`
- Dev (API + client): `npm run dev`
- Test: `npm test` (Jest, API) and `npm run test:client` (Vitest)
- Typecheck: `npm run typecheck` — run before saying a task is done

## Layout
- `server/` — Express API. Routes in `server/routes/`, Mongoose models in `server/models/`.
- `client/` — React app (Vite). Pages in `client/src/pages/`.
- `shared/` — Zod schemas used by both sides. Change a schema here, not in two places.

## Constraints
- Never edit `/generated`. It is rebuilt by `npm run codegen`.
- New endpoints need a Zod schema in `shared/` and a Jest test.
- No new dependencies without asking.
- Do not touch `.env*` files.
