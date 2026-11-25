# Technical Specification — Kickzone Tournament Platform

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Tanggal | 22 September 2026 |
| Status | As-built specification + target production architecture |
| Implementasi | Expo/React Native, Next.js, Drizzle ORM, PostgreSQL |

## 1. Tujuan dan batas dokumen

Dokumen ini menetapkan struktur teknis, kontrak, model data, aturan integritas, keamanan, pengujian, dan operasi platform Kickzone. Detail berlabel **As-built** menjelaskan codebase saat ini. Detail berlabel **Target** adalah syarat sebelum rilis terintegrasi/production.

Dokumen ini harus dibaca bersama `PRD.md`. Jika terdapat perbedaan, schema dan kontrak yang sudah disetujui melalui ADR/migrasi terbaru menjadi sumber teknis, sedangkan perilaku produk mengikuti PRD.

## 2. System context

```text
┌──────────────────────┐       HTTPS /api/v1       ┌─────────────────────────┐
│ Expo React Native    │ ─────────────────────────▶ │ Next.js application      │
│ Fan + Coach mobile   │ ◀───────────────────────── │ Admin UI + Route Handler │
└──────────────────────┘                            └────────────┬────────────┘
                                                               │ Drizzle ORM
┌──────────────────────┐       HTTPS / Server UI                ▼
│ Admin browser        │ ─────────────────────────▶ ┌─────────────────────────┐
└──────────────────────┘                            │ PostgreSQL               │
                                                    │ domain + auth + outbox  │
                                                    └────────────┬────────────┘
                                                                 │ worker/adapters
                                                                 ▼
                                                    email / push / media / PDF
```

Next.js saat ini berfungsi sebagai modular monolith: admin UI, Server Actions, mobile API, authentication, services, dan database access berada di `apps/web`. Worker terpisah memproses `job_outbox`.

## 3. Technology baseline

### 3.1 Mobile

- Expo 57, React Native 0.86, React 19, TypeScript 6.
- React Navigation native stack dan bottom tabs.
- TanStack Query untuk server state.
- Zustand untuk session/UI/client state.
- AsyncStorage/SecureStore boundary untuk persistence.
- React Hook Form dan Zod tersedia; implementasi form saat ini sebagian memakai state lokal.
- Jest + React Native Testing Library.

### 3.2 Web/backend

- Next.js 16 App Router, React 19, TypeScript 5.7.
- Server Components untuk reads dan Server Actions untuk admin mutations.
- Route Handler catch-all `/api/v1/[[...path]]` untuk mobile REST API.
- Drizzle ORM 0.45 dan `pg` untuk PostgreSQL.
- Zod 4 untuk validation.
- bcrypt untuk password hashing.
- Vitest untuk unit tests.

### 3.3 Tooling commands

| Scope | Command |
|---|---|
| Monorepo typecheck/lint/test | `npm run typecheck`, `npm run lint`, `npm test` |
| Mobile dev | `npm run dev:mobile` (atau `npm start` di `apps/mobile`) |
| Mobile typecheck/lint/test | `npm run typecheck --workspace=@kickzone/mobile` |
| Admin dev/build | `npm run dev:web`, `npm run build:web` |
| Admin typecheck/test | `npm run typecheck --workspace=@kickzone/web`, `npm test --workspace=@kickzone/web` |
| Migration | `npm run db:migrate` |
| Seed | `npm run db:seed` |
| Demo data | `npm run db:seed:demo` |
| Worker | `npm run jobs:work` |

## 4. Repository structure

```text
/
├─ apps/
│  ├─ mobile/
│  │  ├─ App.tsx                 # mobile composition root
│  │  └─ src/
│  │     ├─ components/          # modular reusable mobile UI (layout, controls, cards, sheet)
│  │     ├─ data/                # demo/fallback data
│  │     ├─ design-system/       # colors, spacing, radius, fonts
│  │     ├─ domain/              # mobile domain/DTO types
│  │     ├─ features/            # screens per feature
│  │     ├─ navigation/          # stack/tab route contracts
│  │     ├─ services/api/        # API boundary + repositories
│  │     ├─ services/storage/    # session persistence
│  │     └─ store/               # Zustand client state
│  └─ web/
│     └─ src/
│        ├─ app/                 # Next routes, pages, domain actions/, API v1
│        ├─ components/          # ui/, layout/, operations/, features/
│        ├─ db/                  # schema, migrations, seed, reset
│        ├─ lib/                 # auth/, domain/, api/, infra/
│        ├─ jobs/                # outbox worker
│        └─ __tests__/           # unit/ and integration/ test suites
└─ docs/                         # PRD, technical specification, archive/, design/
```

Target layering:

```text
UI/Route → application service → domain rule → repository/Drizzle → PostgreSQL
                                      └──────→ outbox → integration adapter
```

UI tidak boleh menulis database secara langsung untuk mutation yang memiliki business rule lintas tabel. Existing direct writes pada Server Actions harus secara bertahap dipindahkan ke application service.

## 5. Mobile architecture

### 5.1 Composition dan navigation

`App.tsx` memasang font, SafeArea, QueryClient, NavigationContainer, dan session hydration. `RootNavigator` memilih `Login` atau authenticated stack berdasarkan Zustand session.

Authenticated routes:

- bottom tabs: `Home`, `Schedule`, `News`;
- common stack: `Menu`, `Competition`, `Group`, `TeamDetail`, `MatchDetail`, `Favorites`, `Content`;
- coach-only: `CoachDashboard`, `ManageTeam`.

Route parameters harus tetap didefinisikan di `RootStackParamList`/`MainTabParamList`. Deep-link mapping target menggunakan scheme `kickzone://` dan wajib memvalidasi ID sebelum fetch.

### 5.2 State ownership

| Jenis state | Owner | Contoh |
|---|---|---|
| Server state | TanStack Query | home, matches, standings, team stats, coach setup |
| Auth/client state | Zustand + secure storage | session, role-derived navigation |
| Ephemeral UI | Component state | selected tab/filter, sheet visibility, draft fields |
| Canonical business data | PostgreSQL/API | team, roster, score, standings, approval status |

Canonical data tidak boleh disalin permanen ke Zustand. Existing local `players`, `coachNames`, dan `jerseys` hanya fallback demo dan harus dihapus dari production path setelah API integration.

### 5.3 Query key convention

```ts
['home', tournamentId]
['schedule', filters]
['match', matchId]
['team', teamId]
['team', teamId, 'stats']
['stage', stageId, 'standings']
['stage', stageId, 'matches']
['coach', 'teams']
['coach', 'team', teamId, 'setup']
['notifications', filters]
```

Mutation coach menginvalidasi setup/team keys terkait. Favorite memakai optimistic update dengan snapshot dan rollback. Logout menghapus query cache privat.

### 5.4 API client target

Client harus:

- membentuk base URL dari `EXPO_PUBLIC_API_URL`;
- menambahkan bearer access token secara otomatis;
- melakukan satu refresh terkoordinasi saat 401 `ACCESS_TOKEN_EXPIRED`;
- mengulang request original satu kali setelah refresh;
- logout atomik bila refresh gagal;
- menerapkan timeout dan cancellation melalui `AbortController`;
- membaca `{ data, meta }` dan `{ error: { code, message, fields? } }`;
- tidak log token, password, atau PII sensitif.

As-built `apiFetch` belum otomatis mengambil token/refresh dan repository DTO belum selalu cocok dengan bentuk API yang memiliki wrapper seperti `{ match }` atau `{ team }`.

### 5.5 Live data

- Match `LIVE`: refetch 20–30 detik.
- Home live summary: refetch 30 detik ketika app foreground.
- Polling berhenti saat background atau status bukan `LIVE`.
- Error polling memakai exponential backoff dengan jitter dan mempertahankan last known data.
- Target P1 dapat mengganti polling dengan SSE/WebSocket tanpa mengubah query model publik.

### 5.6 Offline dan demo mode

Demo fallback hanya aktif pada build development/test. Production build harus memerlukan API URL. Cache read-only dapat ditampilkan saat offline dengan badge stale; mutation tidak boleh dianggap berhasil sampai server mengonfirmasi.

## 6. Admin web architecture

### 6.1 Routing

- Public auth: `/login`, `/forgot-password`, `/reset-password`.
- Authenticated layout: `/(admin)` dengan `AdminShell`.
- Operation modules: dashboard, tournaments, age-groups, stages, venues, teams, coaches, players, matches, live-score, news, highlights, rules, notifications, reports, audit, accounts.
- Detail route generik: `/(operations)/[section]/[id]`.

### 6.2 Rendering dan mutation

- Reads dilakukan pada Server Components langsung melalui Drizzle.
- Admin writes dilakukan melalui Server Actions.
- Setiap action melakukan authentication/permission, parse + validation, service call, audit/outbox bila relevan, lalu `revalidatePath`.
- Error yang dapat diperbaiki pengguna dikembalikan sebagai `ActionState`, bukan exception mentah di UI.

Target: semua operation page menerima pagination/filter/sort server-side. Jangan memuat seluruh tabel lalu melakukan `.slice()`/filter di memory pada dataset production.

### 6.3 Sensitive action gate

Action berikut wajib memiliki checkbox/modal confirmation dan server-side flag:

- finalisasi/koreksi hasil;
- approval/rejection submission;
- ranking override;
- role/admin changes;
- publish/unpublish/archive;
- destructive/deactivation action.

## 7. API specification

### 7.1 Base dan conventions

- Base path: `/api/v1`.
- Transport: HTTPS production.
- Content type: `application/json`.
- Authenticated mobile endpoints: `Authorization: Bearer <accessToken>`.
- Pagination: `page` default 1, `pageSize` default 20 dan maksimum 100.
- Search: `q`, maksimum 160 karakter.
- Timestamp: ISO-8601 UTC.
- ID: UUID pada server; mobile harus memperlakukan ID sebagai opaque string.

Success envelope:

```json
{
  "data": {},
  "meta": {
    "page": 1,
    "pageSize": 20,
    "count": 100,
    "pollIntervalSeconds": 30,
    "requestId": "optional"
  }
}
```

Error envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Readable message",
    "fields": { "fieldName": "Field-specific message" },
    "requestId": "optional"
  }
}
```

Status minimum: 200/201 sukses, 400 malformed/state error, 401 unauthenticated, 403 forbidden, 404 missing, 409 conflict, 422 validation, 429 rate limited, 500 unexpected.

### 7.2 Endpoint inventory as-built

#### Authentication

| Method | Path | Auth | Fungsi |
|---|---|---|---|
| POST | `/auth/login` | Public | Login dan issue access/refresh token |
| POST | `/auth/refresh` | Refresh token | Rotate token pair |
| POST | `/auth/logout` | Target: refresh/access | Revoke refresh token/session |
| POST | `/auth/password-reset/request` | Public | Queue reset request tanpa enumeration |
| POST | `/auth/password-reset/confirm` | Reset token | Ganti password |

#### Public/published reads

| Method | Path | Fungsi |
|---|---|---|
| GET | `/home` | Live/upcoming match dan news terbaru |
| GET | `/tournaments` | Tournament published |
| GET | `/tournaments/:id/age-groups` | Age group aktif |
| GET | `/age-groups/:id/stages` | Stage published |
| GET | `/stages/:id` | Detail stage |
| GET | `/stages/:id/standings` | Klasemen dan team |
| GET | `/stages/:id/matches` | Fixture stage |
| GET | `/teams` | Team pada tournament published |
| GET | `/teams/:id` | Detail team |
| GET | `/teams/:id/players` | Player approved |
| GET | `/teams/:id/matches` | Match team |
| GET | `/teams/:id/stats` | Statistik agregat |
| GET | `/matches` | Schedule/live/finished |
| GET | `/matches/:id` | Detail match |
| GET | `/matches/:id/events` | Event match |
| GET | `/matches/:id/highlights` | Media published |
| GET | `/news` | News published |
| GET | `/news/:id` | Detail news published |
| GET | `/venues` | Venue aktif pada tournament published |
| GET | `/tournament-rules` | Rules published |
| GET | `/certificates/:id/check?code=` | Verifikasi certificate code |

#### Authenticated user/coach

| Method | Path | Fungsi |
|---|---|---|
| GET | `/me` | Identity dan roles |
| GET/POST/DELETE | `/me/favorite-teams[/:teamId]` | Daftar/tambah/hapus favorit |
| GET | `/notifications` | Notifikasi milik user |
| PATCH | `/notifications/:id/read` | Tandai dibaca dengan ownership check |
| GET | `/coach/teams` | Team assignment aktif |
| GET | `/coach/teams/:teamId/setup` | Submission/setup projection |
| POST | `/coach/teams/:teamId/coach-names/submissions` | Submit coach name |
| POST | `/coach/teams/:teamId/jerseys/submissions` | Submit jersey |
| POST | `/coach/teams/:teamId/players/submissions` | Submit player/revision |
| POST | `/certificates/generate` | Generate certificate untuk user eligible |

### 7.3 Required contract corrections

Sebelum mobile terintegrasi:

1. Normalisasi row shape: jangan campur `{ match: {...} }`, raw match, dan nested join tanpa DTO mapper.
2. `/home` harus sesuai `HomeData`: tetapkan `hero`, `matchesToday`, `upcomingMatches`, `news`, `certificateAvailable`, `unreadNotifications` atau ubah mobile contract secara eksplisit.
3. `/coach/teams/:id/setup` harus mengembalikan aggregate `CoachTeamSetup`, bukan tiga list mentah saja.
4. Submission coach name harus konsisten: mobile saat ini mengirim `{ names: string[] }`, API saat ini mengharapkan `coachName` tunggal.
5. Jersey DTO harus konsisten antara `{ home, away }` dan JSON object `homeJersey/awayJersey`.
6. Team stats API harus menyediakan age/group/squad/jersey yang dibutuhkan UI atau mobile memisahkan query detail dan stats.
7. Auth logout harus menerima/revoke refresh token.
8. Tambahkan OpenAPI 3.1 atau generated shared schema dan contract tests.

## 8. Authentication dan authorization

### 8.1 Admin session

- Random 32-byte session token dikirim sebagai cookie `tyc_admin_session`.
- Database hanya menyimpan SHA-256 token hash.
- Idle expiry 30 menit dan sliding refresh pada request authenticated.
- Cookie `httpOnly`, `sameSite=lax`, `path=/`, serta `secure` di production.
- Password bcrypt cost 12.

Target hardening: CSRF threat model untuk Server Actions, session cleanup job, absolute session lifetime, security headers, shared login limiter, MFA untuk Super Admin, dan forced password change untuk seeded account.

### 8.2 Mobile token

- Access token as-built berisi base64url `{ sub, exp }` dan SHA-256 signature berbasis `SESSION_SECRET`; TTL 15 menit.
- Refresh token acak disimpan sebagai hash; TTL 30 hari; rotation menandai token lama revoked.
- Target: gunakan standar JWT/HMAC yang diaudit atau opaque access session; selalu validasi payload schema, algorithm, issuer, audience, clock skew, dan malformed input.
- `SESSION_SECRET` wajib ada di production; fallback `development-secret` harus dilarang oleh startup validation.

### 8.3 RBAC

Roles seeded: `SUPER_ADMIN`, `OPERATOR`, `COACH`, `USER`.

Permissions seeded:

```text
tournament.read, tournament.write,
team.read, team.write,
coach.review, player.review,
match.schedule, match.score,
content.publish, notification.send,
admin.manage, audit.read
```

Super Admin memperoleh seluruh permission. Operator memperoleh seluruh permission kecuali `admin.manage` dan `tournament.write` pada seed saat ini. Semua admin route/action harus memanggil `requirePermission`; coach API harus memanggil `requireCoach(request, teamId)`.

## 9. Database specification

### 9.1 Entity groups

| Group | Tables |
|---|---|
| Identity/RBAC | `users`, `roles`, `permissions`, `user_roles`, `role_permissions` |
| Session/security | `admin_sessions`, `refresh_tokens`, `password_reset_tokens` |
| Tournament structure | `sports`, `tournaments`, `age_groups`, `stages`, `venues`, `pitches` |
| Participants | `teams`, `coach_team_assignments`, `players`, `player_team_history` |
| Approval | `coach_name_submissions`, `jersey_submissions`, `player_submissions` |
| Competition | `matches`, `match_events`, `standings`, `team_statistics` |
| Content | `news`, `media`, `tournament_rules` |
| Engagement | `notifications`, `favorites`, `certificates` |
| Operations | `audit_logs`, `job_outbox` |

### 9.2 Key constraints

- user email, role code, permission code, sport code, tournament slug: unique;
- age group name: unique per tournament;
- team name: unique per tournament;
- active coach/team pair: unique;
- jersey number: unique per team;
- standing: unique per stage/team;
- favorite: composite primary key user/team;
- token hash dan certificate verification code: unique;
- match stage/start indexed; audit entity indexed.

Target constraints yang perlu diaudit/ditambahkan:

- check `tournaments.ends_at >= starts_at`;
- check score/minute/duration/buffer/capacity/squad/jersey non-negative dan bounded;
- home team berbeda dari away team;
- partial uniqueness untuk assignment benar-benar aktif bila history dibutuhkan;
- index seluruh FK dan query filter populer;
- database-level strategy untuk mencegah race duplicate jersey/over-capacity;
- referential consistency lintas tournament yang tidak dapat dijamin hanya oleh FK tunggal.

### 9.3 Status enums

- `user_status`: ACTIVE, INACTIVE.
- `tournament_status`: DRAFT, PUBLISHED, ARCHIVED.
- `submission_status`: NOT_STARTED, PENDING, APPROVED, REJECTED.
- `match_status`: SCHEDULED, LIVE, FINISHED, POSTPONED, CANCELLED.
- `player_status`: ACTIVE, INACTIVE, TRANSFERRED.
- `content_status`: DRAFT, PUBLISHED, ARCHIVED.
- `delivery_status`: QUEUED, DELIVERED, FAILED.

### 9.4 Migration policy

- Schema berubah hanya melalui migration berurutan dan code review.
- Migration production harus backward-compatible untuk rolling deploy bila digunakan.
- Perubahan destructive memakai expand–migrate–contract.
- CI menjalankan migration dari database kosong dan upgrade dari snapshot versi terakhir.
- `db:reset` hanya development/test dan harus menolak database production.

## 10. Domain services dan transactions

### 10.1 Services as-built

- `tournamentService`: create tournament draft + audit.
- `teamService`: validasi age group dan create team + audit.
- `submissionService`: submit/review player, coach name, jersey; approval menulis canonical data dan outbox.
- `scheduleService`: create fixture, conflict detection, round-robin.
- `standingsService`: manual rank override dengan reason/audit.
- `matchService`: set live dan finalize/correct score.
- `recalculateCompetition`: rebuild standings stage dan team statistics dari match finished.

### 10.2 Match finalization transaction

```text
Lock/read match + verify version/state
  → validate event teams/players
  → replace/upsert match events
  → update score/status/finalizedAt/version
  → recalculate standings for stage
  → recalculate affected team statistics
  → insert audit before/after
  → insert outbox event
COMMIT
```

Semua tahap harus berada dalam satu transaction. Gunakan optimistic version check (`WHERE id=? AND version=?`) atau row lock untuk mencegah lost update. Request finalisasi harus mendukung idempotency key agar retry tidak menggandakan event/outbox.

### 10.3 Football standings

Per match finished:

- win: 3 point;
- draw: 1 point per team;
- loss: 0 point;
- `goalDifference = goalsFor - goalsAgainst`;
- urutan as-built: points DESC, goal difference DESC, goals for DESC.

Manual override harus disimpan terpisah dari calculated rank dan diterapkan pada projection; recalculation tidak boleh menghapus alasan/history override.

### 10.4 Scheduling conflict

Window pertandingan adalah `[startsAt, startsAt + duration + buffer)`. Dua window overlap jika `aStart < bEnd && bStart < aEnd`. Sistem memeriksa:

- pitch sama;
- salah satu team sama;
- entity berada pada tournament/stage yang konsisten.

Validasi aplikasi tidak cukup untuk concurrency tinggi; target dapat memakai advisory lock per pitch/team/day atau isolation/constraint strategy yang diuji.

## 11. Approval workflow

```text
Coach submits revision
  → validate assignment, payload, no disallowed pending duplicate
  → create PENDING submission + outbox
Admin reviews
  ├─ REJECTED: reason required → audit + notify coach
  └─ APPROVED: transactionally update canonical entity
                + mark submission approved
                + audit + notify coach
```

Approval player harus menghitung approved squad di dalam transaction dan mempertahankan unique jersey invariant. Revision number harus monotonic per logical item/team. Published/fan endpoints hanya membaca canonical approved data.

## 12. Caching dan consistency

- Admin reads default dynamic/uncached untuk operasi; `revalidatePath` setelah mutations.
- API dapat memakai private/no-store untuk identity/coach endpoints.
- Published public reads dapat memakai short TTL/ETag setelah invalidation strategy tersedia.
- Mobile TanStack Query default stale time saat ini 60 detik; match live override polling 20 detik.
- Mutation response harus menjadi sumber langsung untuk cache update bila aman, kemudian background refetch.
- Jangan cache authorization decision lebih lama dari perubahan role/session yang diperbolehkan.

## 13. Outbox dan integrations

`job_outbox` menyimpan `type`, JSON payload, `attempts`, `processedAt`, dan `createdAt`. Worker memilih job belum diproses, memanggil adapter, kemudian menandai hasil.

Event minimum:

- `password.reset.requested`;
- `coach.player.submitted/approved/rejected`;
- event coach/jersey setara;
- `match.started`, `match.finished`, `match.score.corrected`;
- `notification.compose`.

Target worker:

- claim job secara atomik dengan `FOR UPDATE SKIP LOCKED` atau status lease;
- idempotency per outbox ID;
- exponential backoff dan max attempts;
- `lastError`, `nextAttemptAt`, dead-letter state;
- metrics queue depth, age, attempts, failures;
- payload tidak menyimpan secret/raw reset token lebih lama dari kebutuhan; pertimbangkan encrypted payload atau dedicated mail command store.

Integration interfaces: Mailer, PushProvider, ObjectStorage, CertificateRenderer, Analytics, dan Clock. Local adapter boleh digunakan di development; production adapter dipilih melalui environment.

## 14. Media dan certificate

Media production disimpan pada object storage dengan object key, mime type, size, checksum, dan signed upload/download policy. Database tidak menyimpan binary. External URL harus allowlist/protocol validated.

Certificate generation wajib:

- memverifikasi eligibility dari data server;
- memakai template/version deterministic;
- menghasilkan verification code unik;
- menyimpan immutable artifact di object storage;
- menyediakan check endpoint tanpa membocorkan data personal berlebihan.

As-built certificate adapter perlu diperlakukan sebagai local/fixed implementation sampai storage/rendering production dipilih.

## 15. Validation dan error handling

### 15.1 Validation layers

1. UI validation untuk feedback cepat.
2. Zod di API/Server Action sebagai boundary wajib.
3. Domain service untuk state transition dan cross-entity rules.
4. Database constraints untuk invariant terakhir.

UI validation tidak pernah menggantikan server validation.

### 15.2 Stable error codes

Minimum code yang dikonsumsi mobile:

```text
AUTH_INVALID_CREDENTIALS / INVALID_CREDENTIALS
UNAUTHENTICATED / SESSION_EXPIRED / ACCESS_TOKEN_EXPIRED
FORBIDDEN / TEAM_NOT_ASSIGNED
VALIDATION_ERROR / INVALID_JSON
NOT_FOUND / MATCH_NOT_FOUND / CONTENT_NOT_PUBLISHED
SUBMISSION_PENDING / SUBMISSION_ALREADY_PENDING
JERSEY_NUMBER_DUPLICATE / MAX_SQUAD_REACHED
SCHEDULE_CONFLICT / VERSION_CONFLICT
RATE_LIMITED / INTERNAL_ERROR
```

Nama code harus dinormalisasi agar mobile tidak memetakan alias berbeda untuk kasus sama.

## 16. Security specification

### 16.1 Required controls

- startup production gagal jika `DATABASE_URL` atau `SESSION_SECRET` kosong/lemah;
- TLS-only dan secure cookies;
- password policy serta breach/rate protection;
- parameterized query via Drizzle;
- permission/ownership check pada setiap mutation dan private read;
- output encoding/sanitization untuk rich text;
- upload allowlist, size limit, virus scanning, dan content sniffing;
- CORS hanya origin yang dibutuhkan;
- CSP, HSTS, Referrer-Policy, X-Content-Type-Options;
- redaction token/password/cookie pada log;
- dependency/SAST/secret scan di CI;
- audit append-only dan retention policy.

### 16.2 Threat cases yang wajib diuji

- IDOR coach membuka/submitting tim lain;
- user membaca/menandai notifikasi user lain;
- operator mengakses account management atau score correction;
- replay refresh token;
- malformed access token menyebabkan 500;
- concurrent player approvals melewati squad/jersey limit;
- concurrent score finalization menyebabkan lost update;
- unpublished content ditemukan lewat direct ID;
- reset token reuse dan account enumeration;
- CSV/formula injection pada export.

## 17. Observability

Setiap request/job memiliki `requestId`/`correlationId`. Structured log minimum:

- timestamp, level, service, environment;
- request ID, route, method, status, latency;
- authenticated actor ID/role bila aman;
- domain action/entity ID untuk mutation;
- error code dan sanitized stack;
- job type/id/attempt/duration.

Metrics:

- request rate, p50/p95/p99 latency, 4xx/5xx;
- DB pool usage/query latency;
- login failure/rate limit;
- live polling traffic;
- schedule conflict;
- submission age dan approval duration;
- outbox depth/oldest age/failure;
- score finalization/correction count.

Alert minimum: elevated 5xx, DB unavailable/pool exhausted, outbox lag, repeated job failure, migration failure, dan unusual authentication failures.

## 18. Testing strategy

### 18.1 Unit

- standings, time overlap, round-robin, status transition;
- validation schema dan error mapping;
- DTO mapper;
- permission helpers dan token parsing;
- mobile store/repository behavior.

### 18.2 Integration dengan PostgreSQL

- migrations + seed;
- auth/session/refresh/reset lifecycle;
- RBAC dan ownership;
- submission approval/rejection;
- schedule conflict dan concurrent create;
- match finalization rollback/concurrency;
- published visibility filters;
- outbox write dan worker retry.

### 18.3 Contract

- OpenAPI/schema response untuk semua `/api/v1` endpoint;
- generated fixtures yang diuji pada API dan mobile repository;
- backward compatibility check pada CI.

### 18.4 UI/E2E

- Mobile: login, browse competition, live match refresh, favorite rollback, coach submission/rejection.
- Admin: login, permission denial, create tournament/team/match, approval, finalization, correction, publish content.
- Accessibility smoke: label, focus, contrast, keyboard admin.

### 18.5 Quality gates

PR tidak dapat merge jika typecheck, lint, unit, integration, migration, dan critical contract tests gagal. Production deploy membutuhkan E2E smoke pada staging dan successful backup/rollback checkpoint.

Baseline 22 September 2026:

- web typecheck lulus;
- web Vitest: 1 file/2 test lulus;
- root typecheck gagal karena scope root ikut memeriksa `apps/web` tanpa alias web;
- root Jest menemukan dan mencoba menjalankan test Vitest di `apps/web`, sehingga command agregat gagal; dua suite mobile lulus dengan empat test;
- cakupan test masih jauh di bawah target di atas.

## 19. Environment configuration

| Variable | Scope | Required | Keterangan |
|---|---|---|---|
| `EXPO_PUBLIC_API_URL` | Mobile | Production | Origin backend tanpa `/api/v1` trailing path |
| `DATABASE_URL` | Web/worker | Ya | PostgreSQL connection string |
| `SESSION_SECRET` | Web/API | Production | Secret kuat untuk token signing; tanpa fallback production |
| `SEED_ADMIN_EMAIL` | Seed | Non-prod/bootstrap | Email initial Super Admin |
| `SEED_ADMIN_PASSWORD` | Seed | Non-prod/bootstrap | Password temporary, harus dirotasi |
| `NODE_ENV` | Semua | Ya | development/test/production |

Target provider menambah variable khusus email, push, object storage, analytics, dan error tracking. Public Expo variables tidak boleh mengandung secret.

## 20. Deployment architecture

Minimum production topology:

- satu deploy Next.js Node runtime untuk admin + API;
- satu worker process dengan release artifact yang sama;
- managed PostgreSQL dengan PITR/backup;
- object storage + CDN;
- secret manager;
- centralized log/metrics/error tracking.

Deployment order:

1. backup/checkpoint;
2. migration backward-compatible;
3. deploy web/API;
4. deploy worker;
5. smoke admin/API;
6. staged mobile rollout setelah compatibility check.

Health endpoints target: liveness tidak menyentuh dependency; readiness memeriksa DB dan migration compatibility. Deploy harus dapat rollback aplikasi tanpa merusak schema.

## 21. Performance dan capacity baseline

Sebelum load test, tetapkan asumsi jumlah tournament aktif, team/tournament, concurrent fan, request polling, dan operator. Baseline target awal:

- p95 public read <500 ms;
- p95 admin mutation <1 s di luar external integration;
- finalisasi + recalculation <2 s untuk ukuran stage target;
- query list selalu bounded;
- tidak ada N+1 pada list/detail utama;
- worker outbox normal lag <60 detik.

Load test harus memodelkan burst polling ketika match live dan finalisasi serentak pada beberapa pitch.

## 22. Known gaps dan remediation priority

### P0

1. Selaraskan seluruh DTO mobile–API dan tambahkan contract tests.
2. Implementasikan real mobile auth token injection, refresh, logout revocation, dan secure persistence.
3. Pisahkan TS scope root/web hingga aggregate typecheck hijau.
4. Wajibkan `SESSION_SECRET` production dan harden token parser.
5. Tambahkan DB-backed/shared rate limiter.
6. Tambahkan concurrency protection untuk score, squad, jersey, dan schedule.
7. Pastikan semua private/admin route memiliki permission/ownership test.
8. Hilangkan demo fallback dari production build.

### P1

1. Server-side pagination/filter/sort admin.
2. Production outbox worker, email/push, media storage, dan certificate renderer.
3. Full audit before/after serta retention.
4. Reports/export dengan CSV injection protection.
5. Observability, health checks, backup/restore, dan runbook.

### P2

1. Realtime transport untuk live match.
2. Multi-sport rule engine.
3. Advanced bracket/schedule editor.
4. Multi-tenant isolation bila bisnis membutuhkannya.

## 23. Architecture decisions

| ID | Keputusan | Status |
|---|---|---|
| ADR-001 | Modular monolith Next.js menjadi backend awal | Diterima |
| ADR-002 | PostgreSQL + Drizzle sebagai persistence canonical | Diterima |
| ADR-003 | Server Actions untuk admin mutations, REST `/api/v1` untuk mobile | Diterima |
| ADR-004 | TanStack Query untuk mobile server state, Zustand hanya client/auth state | Diterima |
| ADR-005 | Transactional outbox untuk external side effects | Diterima, perlu hardening |
| ADR-006 | Polling 20–30 detik untuk live MVP | Diterima |
| ADR-007 | Football-first calculation | Diterima sementara |
| ADR-008 | Standard token format/provider | Belum diputuskan |
| ADR-009 | Production integration providers | Belum diputuskan |
| ADR-010 | Tournament/timezone selection model | Belum diputuskan |

## 24. Technical Definition of Done

- DTO/API schema versioned dan mobile contract test lulus.
- Semua build, typecheck, lint, test, migration, dan E2E critical path lulus di CI.
- Tidak ada production fallback secret atau demo data.
- P0 security controls dan threat tests lulus.
- Database constraints, transactions, locking/versioning, audit, dan outbox diuji.
- Monitoring, alerting, backup, restore, rollback, dan incident runbook tersedia.
- Performance target dibuktikan dengan load test representatif.
- Open decisions yang mengubah data/API telah dituangkan dalam ADR dan migration plan.
