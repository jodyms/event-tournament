# Kickzone / TYC

Football tournament platform: an npm-workspaces monorepo containing the Expo mobile app (`apps/mobile`, package `@kickzone/mobile`) for fans and coaches, and the Next.js admin + `/api/v1` backend (`apps/web`, package `@kickzone/web`).

Product behavior is in `docs/PRD.md`. As-built versus target engineering is in `docs/TECHNICAL_SPECIFICATION.md`. Numbered files under `docs/archive/` (`01_` through `07_`) are earlier planning inputs. When they disagree, follow `docs/PRD.md` for behavior and the Drizzle schema plus migrations for data shape.

## Commands

Monorepo (from the repo root):

```powershell
npm install
npm run typecheck
npm run lint
npm test
npm run dev:mobile
npm run dev:web
```

Mobile (`apps/mobile`, or with `--workspace=@kickzone/mobile`):

```powershell
npm start
npm run android
npm run typecheck
npm run lint
npm test
```

Admin and API (`apps/web`, needs `apps/web/.env` with `DATABASE_URL`):

```powershell
npm run dev
npm run build
npm run typecheck
npm run lint
npm test
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:reset
npm run jobs:work
```

Run the affected package’s checks (or root workspace checks) after a change. `npm run db:reset` drops the development database; do not run it unless the user asked.

## Mobile (`apps/mobile/src/`)

Expo SDK 57, React Native 0.86, React 19. Entry is `apps/mobile/index.ts` → `apps/mobile/App.tsx` (fonts, TanStack Query, navigation theme) → `src/navigation/RootNavigator.tsx`.

- `src/features/<domain>` — screens. Coach stack screens render only when `session.user.roles` includes `COACH`.
- `src/components/` — modular shared UI (`layout.tsx`, `controls.tsx`, `cards.tsx`, `sheet.tsx`), exported via `src/components/index.ts`. Prefer these over one-off controls.
- `src/design-system/theme.ts` — dark tokens. Use `colors`, `spacing`, `radius`, and `fonts`. Brand green is `#3EBF5F`. Canvas is `#0A0A0F`. Font is Plus Jakarta Sans.
- `src/domain/models.ts` — client types. `src/data/mockData.ts` — demo data.
- `src/store/appStore.ts` — Zustand UI and session state.
- `src/services/api/client.ts` — the only `fetch` boundary. `tournament.ts` calls it. Demo data is used only when `EXPO_PUBLIC_API_URL` is unset and the build is `__DEV__` or a test. A production build with an empty URL shows the offline gate and does not boot the app.
- `src/services/storage/session.ts` — token storage. Never put backend secrets in the Expo bundle.
- `src/services/api/map.ts` — the only place that maps API `SCHEDULED`/`FINISHED` to UI `UPCOMING`/`COMPLETED`.

When `EXPO_PUBLIC_API_URL` is set, `useAppStore.login` calls `/api/v1/auth/login` and stores `accessToken`, `refreshToken`, and `expiresAt`. Demo mode still writes a local session (`demo-access-token`, roles `USER` and `COACH`). Password minimum is 8 characters on the device and the API.

User-facing mobile copy is Indonesian. Keep new strings in that language. Match the formatting of the file you edit. TypeScript is strict with `noUncheckedIndexedAccess`. Tests are Jest (`jest-expo`) next to the code in `__tests__`. Lint allows unused names only when they start with `_`.

Visual reference: `docs/design/mockup/*.png`, `docs/design/mockup-web/*.jpg`, and `docs/design/figma/*.pdf`. Do not treat those folders as source.

## Admin and API (`apps/web`)

Next.js 16 App Router, React 19, Drizzle, PostgreSQL, Zod 4. This Next.js is not the version in training data. Before writing Next.js APIs, read the guide under `apps/web/node_modules/next/dist/docs/` (or hoisted `node_modules/next/dist/docs/`) and follow deprecation notes. `apps/web/AGENTS.md` carries the same warning and wins over this file for that package.

- Import app code with `@/` (`apps/web/src`).
- Admin UI: `src/app/(admin)/(operations)/` and `src/components/` (`ui/`, `layout/`, `operations/`, `features/`). `(admin)/layout.tsx` redirects to `/login` when `currentAdmin()` fails.
- Mutations: domain Server Actions under `src/app/actions/` (`auth.ts`, `admin.ts`, `tournaments.ts`, `teams.ts`, `matches.ts`, `content.ts`, plus shared non-action helpers in `shared.ts`). Gate them with `requirePermission`.
- Mobile HTTP: catch-all `src/app/api/v1/[[...path]]/route.ts`. Add a branch there. Return `apiData` / `apiError` from `src/lib/api/errors.ts`. Shape is `{ data, meta }` or `{ error: { code, message, fields? } }`.
- `src/lib/` is organized into `auth/` (`session.ts`, `access-token.ts`), `domain/` (`services.ts`, `competition.ts`, `tournament-status.ts`), `api/` (`errors.ts`, `validation.ts`, `mobile-dto.ts`, `mobile-read.ts`), and `infra/` (`integrations.ts`, `uploads.ts`, `report-filters.ts`).
- Rules that must stay consistent (standings, squad size, pitch conflicts, approvals) belong in `src/lib/domain/services.ts` and `src/lib/domain/competition.ts`, inside a Drizzle transaction. Write `audit_logs` for critical mutations and `job_outbox` for async work. The worker is `src/jobs/worker.ts`.
- Schema: `src/db/schema.ts`. Change it, then `npm run db:generate` and commit the SQL migration. Do not hand-edit `src/db/migrations/meta`.
- Validate inputs with Zod in `src/lib/api/validation.ts`.
- Tests live under `src/__tests__/unit/` and `src/__tests__/integration/`.

Auth:

- Admin session cookie is `tyc_admin_session` (httpOnly, 30 minute idle). Roles are `SUPER_ADMIN` and `OPERATOR`. Permissions are string codes such as `match.score`. `SUPER_ADMIN` is seeded with every permission, not a magic `*` grant.
- Mobile access tokens are `Bearer` payloads signed with `SESSION_SECRET`. Refresh tokens are stored hashed. Coach routes must use `requireCoach(request, teamId)`.
- Seeded local admin defaults to `admin@tyc.local` / `ChangeMe123!` unless `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are set. Do not commit `.env` or real secrets.

Public reads only return published tournaments, published stages, approved players, and non-deleted published news. Live home and live match payloads set `meta.pollIntervalSeconds` to 30.

## Wiring the two apps

`EXPO_PUBLIC_API_URL` points at the Next origin. The client appends `/api/v1`.

Status enums stay different. Map them only in `src/services/api/map.ts`. Do not cast one onto the other in screens.

| Concept | Mobile `models.ts` | Postgres / API |
|---|---|---|
| Not started | `UPCOMING` | `SCHEDULED` |
| Finished | `COMPLETED` | `FINISHED` |
| Also shared | `LIVE`, `POSTPONED`, `CANCELLED` | same |

`GET /api/v1/home` returns `hero`, `matchesToday`, `upcomingMatches`, `news`, `certificateAvailable`, and `unreadNotifications`. `getHome()` maps that payload in `src/services/api/tournament.ts`.

Zod major versions differ (mobile 3, admin 4). Keep each schema in its own package.

## Checks and scope

- `graphify-out/` is an older map of the mobile app and planning docs. It does not describe the current monorepo layout. Prefer the source above.
- Ignore `node_modules`, `.next`, `.expo`, `graphify-out`, and `docs/design` when linting or searching for code.
- Leave unrelated files alone. Match local style.
