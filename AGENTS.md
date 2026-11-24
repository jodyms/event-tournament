# Kickzone / TYC

Football tournament platform: an Expo mobile app for fans and coaches, and a Next.js admin that is also the `/api/v1` backend. Two separate npm projects. There is no workspace root.

Product behavior is in `PRD.md`. As-built versus target engineering is in `TECHNICAL_SPECIFICATION.md`. Numbered files `01_` through `07_` are earlier planning inputs. When they disagree, follow `PRD.md` for behavior and the Drizzle schema plus migrations for data shape.

## Commands

Mobile, from the repo root:

```powershell
npm install
npm start
npm run android
npm run typecheck
npm run lint
npm test
```

Admin and API, from `apps/web` (needs `apps/web/.env` with `DATABASE_URL`):

```powershell
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:reset
npm run jobs:work
```

Run the package’s own checks after a change. Root `npm run lint` also covers `apps/web` TypeScript, except migrations and `.next`. `npm run db:reset` drops the development database. Do not run it unless the user asked.

## Mobile (`src/`)

Expo SDK 57, React Native 0.86, React 19. Entry is `index.ts` → `App.tsx` (fonts, TanStack Query, navigation theme) → `src/navigation/RootNavigator.tsx`.

- `src/features/<domain>` — screens. Coach stack screens render only when `session.user.roles` includes `COACH`.
- `src/components/ui.tsx` — shared UI. Prefer it over new one-off controls.
- `src/design-system/theme.ts` — dark tokens. Use `colors`, `spacing`, `radius`, and `fonts`. Brand green is `#3EBF5F`. Canvas is `#0A0A0F`. Font is Plus Jakarta Sans.
- `src/domain/models.ts` — client types. `src/data/mockData.ts` — demo data.
- `src/store/appStore.ts` — Zustand UI and session state.
- `src/services/api/client.ts` — the only `fetch` boundary. `tournament.ts` calls it and falls back to mock data when `EXPO_PUBLIC_API_URL` is unset.
- `src/services/storage/session.ts` — token storage. Never put backend secrets in the Expo bundle.

Login in `useAppStore.login` still writes a demo session (`demo-access-token`, roles `USER` and `COACH`). It does not call `/api/v1/auth/login`. A valid email and a password of at least 6 characters is enough on device. The API requires at least 8.

User-facing mobile copy is Indonesian. Keep new strings in that language. Match the formatting of the file you edit. TypeScript is strict with `noUncheckedIndexedAccess`. Tests are Jest (`jest-expo`) next to the code in `__tests__`. Lint allows unused names only when they start with `_`.

Visual reference: `mockup/*.png` and `figma/*.pdf`. Do not treat those folders as source.

## Admin and API (`apps/web`)

Next.js 16 App Router, React 19, Drizzle, PostgreSQL, Zod 4. This Next.js is not the version in training data. Before writing Next.js APIs, read the guide under `apps/web/node_modules/next/dist/docs/` and follow deprecation notes. `apps/web/AGENTS.md` carries the same warning and wins over this file for that package.

- Import app code with `@/` (`apps/web/src`).
- Admin UI: `src/app/(admin)/(operations)/` and `src/components`. `(admin)/layout.tsx` redirects to `/login` when `currentAdmin()` fails.
- Mutations: server actions in `src/app/actions.ts`. Gate them with `requirePermission`.
- Mobile HTTP: one catch-all, `src/app/api/v1/[[...path]]/route.ts`. Add a branch there. Return `apiData` / `apiError` from `src/lib/errors.ts`. Shape is `{ data, meta }` or `{ error: { code, message, fields? } }`.
- Rules that must stay consistent (standings, squad size, pitch conflicts, approvals) belong in `src/lib/services.ts` and `src/lib/competition.ts`, inside a Drizzle transaction. Write `audit_logs` for critical mutations and `job_outbox` for async work. The worker is `src/jobs/worker.ts`.
- Schema: `src/db/schema.ts`. Change it, then `npm run db:generate` and commit the SQL migration. Do not hand-edit `src/db/migrations/meta`.
- Validate inputs with Zod in `src/lib/validation.ts`.

Auth:

- Admin session cookie is `tyc_admin_session` (httpOnly, 30 minute idle). Roles are `SUPER_ADMIN` and `OPERATOR`. Permissions are string codes such as `match.score`. `SUPER_ADMIN` is seeded with every permission, not a magic `*` grant.
- Mobile access tokens are `Bearer` payloads signed with `SESSION_SECRET`. Refresh tokens are stored hashed. Coach routes must use `requireCoach(request, teamId)`.
- Seeded local admin defaults to `admin@tyc.local` / `ChangeMe123!` unless `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are set. Do not commit `.env` or real secrets.

Public reads only return published tournaments, published stages, approved players, and non-deleted published news. Live home and live match payloads set `meta.pollIntervalSeconds` to 30.

## Wiring the two apps

`EXPO_PUBLIC_API_URL` points at the Next origin. The client appends `/api/v1`.

Status enums do not match yet. Do not cast one onto the other.

| Concept | Mobile `models.ts` | Postgres / API |
|---|---|---|
| Not started | `UPCOMING` | `SCHEDULED` |
| Finished | `COMPLETED` | `FINISHED` |
| Also shared | `LIVE`, `POSTPONED`, `CANCELLED` | same |

`getHome()` expects `hero`, `matchesToday`, and `upcomingMatches`. `GET /api/v1/home` returns `liveMatches`, `upcomingMatches`, and `news`. Map at `src/services/api/tournament.ts` when connecting them.

Zod major versions differ (mobile 3, admin 4). Keep each schema in its own package.

## Checks and scope

- `graphify-out/` is an older map of the mobile app and planning docs. It does not describe `apps/web`. Prefer the source above for admin and API questions.
- Ignore `node_modules`, `.next`, `graphify-out`, `figma`, and `mockup` when linting or searching for code.
- Leave unrelated files alone. Match local style, including the dense one-line style in `apps/web` services and routes.
