<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TYC admin web

Repo-wide rules are in the root `AGENTS.md`. This package overrides them for Next.js.

- Run scripts from `apps/web`: `dev`, `typecheck`, `lint`, `test`, `db:generate`, `db:migrate`, `db:seed`, `jobs:work`.
- `db:reset` destroys the development database. Run it only when asked.
- Keep the marked Next.js block above. `next dev` rewrites that block.
- Add mobile endpoints in `src/app/api/v1/[[...path]]/route.ts`. Put integrity rules in `src/lib/domain/services.ts` and `src/lib/domain/competition.ts`.
- Server Actions live by domain under `src/app/actions/` (`shared.ts` holds non-action helpers and `ActionState`).
- Zod here is v4. Do not reuse mobile Zod v3 schemas.
