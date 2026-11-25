# Technical Design / Software Architecture
## React Native Mobile App

### 1. Recommended Stack
- React Native + TypeScript
- Expo development workflow where native requirements permit; use Expo prebuild/custom dev client if native modules are required
- React Navigation
- TanStack Query for server state
- Zustand or Redux Toolkit only for app/client state that is not server state
- React Hook Form + Zod for forms/validation
- Axios or typed fetch wrapper
- react-native-keychain / Expo SecureStore for tokens
- Reanimated + Gesture Handler for interactions
- Bottom sheet library with accessible gestures
- FlashList for large lists
- image caching library compatible with chosen RN/Expo version
- Jest + React Native Testing Library
- Maestro or Detox for E2E
- Sentry or equivalent crash/error monitoring

Package versions should be selected at project bootstrap rather than hard-coded from this document.

### 2. Architectural Style
Feature-oriented clean frontend architecture:

`app/`
- navigation/
- providers/
- config/

`src/`
- components/
- design-system/
- features/
  - auth/
  - home/
  - competition/
  - teams/
  - matches/
  - favorites/
  - coach/
  - news/
  - highlights/
  - notifications/
- services/
  - api/
  - auth/
  - analytics/
  - storage/
- domain/
- hooks/
- utils/
- assets/
- test/

Each feature:
- api.ts
- types.ts
- schemas.ts
- hooks.ts
- screens/
- components/
- __tests__/

### 3. Navigation Architecture
Root stack:
- AuthStack
- AppStack

AuthStack:
- Login

AppStack:
- MainTabs
- Drawer/Side menu routes
- Competition selection sheets/modals
- TeamDetail
- MatchDetail
- CoachStack

MainTabs (based on supplied design concepts):
- Home
- Schedule
- optional center action / product-defined route
- News
- optional Profile

Important: the CSS marks some nav items as hidden in certain exported frames. Final navigation structure should be normalized from the approved Figma prototype, not copied frame-by-frame.

CoachStack:
- CoachDashboard
- ManageTeam
- ManagePlayers
- ConfirmCoachSheet
- JerseyColoursSheet
- AddPlayerSheet

### 4. Design System Translation
Do not translate Figma CSS absolute positioning literally.

Create:
- spacing scale
- color semantic tokens
- typography styles
- radius scale
- elevation/shadow tokens
- component variants

Example semantic colors:
- `bg.canvas = #0A0A0F`
- `bg.nav = #0D0D18`
- `bg.card = #141420`
- `bg.input = #272B30`
- `border.input = #4F575E`
- `brand.primary = #3EBF5F`
- `brand.live = #E8FF4A`
- `text.primary = #FFFFFF`
- `text.muted = #A0A0B0`
- `text.subtle = #5A5A70`
- `status.error = #DC2020`

Typography:
- Plus Jakarta Sans as primary
- Figma contains some Manrope references for helper/error copy; decide whether to preserve or normalize to one family.

Reference dimensions are 393×852, but implementation must use Flexbox, `useWindowDimensions`, max widths, safe areas and dynamic text.

### 5. API Strategy
Base conventions:
- JSON REST is sufficient unless backend already uses GraphQL.
- versioned endpoint e.g. `/api/v1`
- bearer access token
- refresh-token flow if supported
- standard error envelope
- ISO-8601 timestamps with timezone
- stable ids
- pagination for lists

Suggested endpoints:

Auth:
- POST `/auth/login`
- POST `/auth/refresh`
- POST `/auth/logout`
- GET `/me`

Home:
- GET `/home`
or independent endpoints for hero, today's matches and news.

Competition:
- GET `/age-groups`
- GET `/age-groups/{id}/stages`
- GET `/groups/{id}`
- GET `/groups/{id}/standings`
- GET `/groups/{id}/matches`

Teams:
- GET `/teams`
- GET `/teams/{id}`
- GET `/teams/{id}/matches`
- GET `/teams/{id}/players`
- GET `/teams/{id}/stats`

Matches:
- GET `/matches`
- GET `/matches/{id}`
- GET `/matches/{id}/events`
- GET `/matches/{id}/highlights`

Favorites:
- GET `/me/favorite-teams`
- POST `/me/favorite-teams/{teamId}`
- DELETE `/me/favorite-teams/{teamId}`

Coach:
- GET `/coach/teams`
- GET `/coach/teams/{id}/setup`
- PUT `/coach/teams/{id}/coaches`
- PUT `/coach/teams/{id}/jerseys`
- POST `/coach/teams/{id}/players`
- PUT `/coach/teams/{id}/players/{playerId}`
- DELETE `/coach/teams/{id}/players/{playerId}`

Content:
- GET `/news`
- GET `/news/{id}`
- GET `/highlights`
- GET `/notifications`
- GET `/tournament-rules`
- GET `/pitches`

These are proposed contracts, not extracted from the Figma.

### 6. Core TypeScript Models
```ts
type ID = string;

interface User {
  id: ID;
  email: string;
  roles: Array<'USER' | 'COACH' | 'ADMIN'>;
}

interface Team {
  id: ID;
  name: string;
  crestUrl?: string;
  coverUrl?: string;
  ageGroupId: ID;
  groupId?: ID;
}

interface Player {
  id: ID;
  teamId: ID;
  name: string;
  position: string;
  jerseyNumber: number;
  photoUrl?: string;
}

type MatchStatus = 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED';

interface Match {
  id: ID;
  homeTeam: Team;
  awayTeam: Team;
  homeScore?: number;
  awayScore?: number;
  startsAt: string;
  venue?: string;
  competitionLabel?: string;
  status: MatchStatus;
}

interface StandingRow {
  team: Team;
  played: number;
  goalDifference: number;
  points: number;
}
```

### 7. Server State
TanStack Query:
- query keys hierarchical and deterministic;
- stale times based on data volatility;
- optimistic updates only where rollback is safe;
- invalidate team setup after coach mutations;
- invalidate favorites after add/remove.

Example keys:
- `['home']`
- `['group', groupId, 'standings']`
- `['group', groupId, 'matches']`
- `['team', teamId]`
- `['team', teamId, 'players']`
- `['match', matchId]`
- `['coach', 'team', teamId, 'setup']`

### 8. Live Match Strategy
Figma shows LIVE states but does not define realtime transport.

Preferred progression:
1. MVP polling for live match detail (e.g. 15–30s; tune after backend review).
2. Suspend polling when app/screen is backgrounded.
3. If scale/data freshness requires, migrate to WebSocket/SSE.
4. Use backend `updatedAt/version` to prevent stale overwrites.

### 9. Authentication & Security
- password sent only over TLS
- never log password/token
- access/refresh token in SecureStore/Keychain, not AsyncStorage
- role/permission UI guards are convenience only; backend must enforce authorization
- refresh token rotation if supported
- clear secrets on logout
- certificate pinning only if threat model demands it; avoid premature operational complexity
- validate all mutation payloads server-side regardless of client validation
- upload constraints for images/media
- rate limit login backend-side

### 10. Form Validation
Login:
- valid email
- required password

Coach:
- trim names
- backend-configurable max coaches

Jersey:
- required home colour
- optional/required away based on tournament rule

Player:
- required name
- position from controlled enum/list if backend supplies it
- jersey number numeric/range
- unique jersey number per team
- max squad size enforced transactionally by backend

### 11. Persistence
Local:
- auth secrets: secure storage
- non-sensitive preferences: AsyncStorage
- query cache persistence optional

Backend:
- source of truth for competition/team/match/coach data

Favorites:
- backend persistence recommended to synchronize across devices.

### 12. Image & Media
- remote HTTPS URLs
- placeholder for missing crest/photo
- resize/crop server/CDN-side
- avoid full-resolution downloads in cards
- lazy load list images
- video playback via native-compatible player or external provider/deep link according to backend metadata

### 13. Error Handling
Typed error classes:
- NetworkError
- UnauthorizedError
- ForbiddenError
- ValidationError
- NotFoundError
- ServerError

UI:
- inline errors for forms
- retry for queries
- global toast for non-field mutation failures
- dedicated empty state
- offline banner when appropriate

### 14. Accessibility
- screen reader labels for icon-only actions
- >=44pt practical touch targets
- scalable text where layout permits
- do not rely on green/red alone for meaning
- accessible tab roles
- bottom sheets announce title and focus
- video controls accessible

### 15. Performance
- FlashList for long team/player/news lists
- memoize expensive card derivations
- avoid unnecessary global state
- cache images
- split heavy media screen dependencies if tooling supports
- keep live polling scoped to visible screens
- profile startup and JS/UI thread

### 16. Testing
Unit:
- formatters
- standings transforms
- validation schemas
- permissions

Component:
- MatchCard variants
- TeamRow
- PlayerCard
- bottom sheet forms
- loading/error states

Integration:
- login/session
- favorites mutation
- team setup mutations

E2E critical paths:
1. Login → Home
2. Home → Group → Match Detail
3. Favorite add → Favorite list
4. Coach Dashboard → Team → Add Player
5. Logout → Login

### 17. CI/CD
Pull request:
- lint
- TypeScript
- unit tests
- component tests

Main/release:
- build staging
- E2E smoke
- signed Android/iOS build
- source-map upload
- release notes

Environment:
- `.env` mapped through controlled build config
- no production secret embedded in JS bundle except public client configuration

### 18. Observability
- crash reporting
- API failure breadcrumbs without PII/secrets
- performance traces on home/match detail
- release/version/build metadata
- analytics events defined in PRD

### 19. Backend Data Integrity Requirements
Critical rules must be backend enforced:
- coach access only assigned teams
- jersey number uniqueness
- max squad size
- valid competition/team relations
- standings consistency
- match score/event consistency
- favorite ownership

### 20. Definition of Done Per Screen
- matches approved Figma intent
- responsive on supported device matrix
- safe-area correct
- loading/empty/error states
- API integrated
- navigation/back behavior correct
- analytics added
- accessibility labels
- component tests
- E2E coverage if critical flow
- no secrets/PII in logs
- QA acceptance

### 21. Technical Unknowns Blocking Final Architecture
- backend technology/API contract
- authentication/token specification
- realtime mechanism
- media/video provider
- push notification provider
- image upload requirements
- app distribution/CI account setup
- supported OS minimums
- localization
- whether app must work offline
