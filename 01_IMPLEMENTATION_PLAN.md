# Kickzone/TYC Mobile App — Implementation Planning & Breakdown

## 1. Basis of Analysis
This plan is derived from the supplied Figma-export PDFs and `style.css`. The designs show a football tournament / youth competition mobile application with:
- public/fan experiences: Home, matches, team details, group standings, match details, favorite teams, news/highlights entry points;
- authenticated coach experiences: Coach Dashboard, team management, coach confirmation, jersey colours, player registration;
- bottom-sheet drill-down selection for age → group/stage → team;
- dark visual system with green primary accent.

Items not represented in the supplied screens are marked as **product/technical assumptions** and must be validated before build.

## 2. Product Modules

### A. Foundation
- React Native app shell
- TypeScript
- navigation
- environment/configuration
- API client
- secure token storage
- error handling
- analytics/logging hooks
- reusable design system
- image/icon/font pipeline
- accessibility baseline
- responsive/safe-area behavior

### B. Authentication
Screens:
- Login

Capabilities:
- email input
- password input
- login action
- Terms of Service / Privacy Policy links
- authenticated session
- logout
- session restore

Assumptions / missing design:
- forgot password
- registration
- password visibility
- loading/error/locked-account states
- refresh token behavior

### C. Home / Discovery
Screens/features visible:
- hero live/highlight card
- LIVE badge
- play action
- certificate CTA
- Matches Today horizontal cards
- quick modules: Matches, Teams, Highlights
- football news feed
- notification icon
- bottom navigation

Required implementation:
- home aggregation API
- match status rendering: live / soon / completed
- media thumbnail / hero image
- content category chips
- list pagination where relevant
- empty/loading/error states

### D. Competition Browser
Flow:
1. Select age group
2. Select group/playoff stage
3. View group
4. Table tab or Matches tab

Age groups shown:
- Under 11
- Under 13
- Under 15

Stage examples:
- U11 Group A
- U11 Group B
- U11 Cup

Group standings:
- team
- played (P)
- goal difference (GD)
- points (PTS)

Group matches:
- venue
- competition/group
- time/date
- teams
- score

### E. Team
Screens:
- team detail — Matches
- team detail — Players
- Stats tab is visually present, but its content is not supplied

Features:
- team crest and cover/banner
- team age/group
- favorite/unfavorite
- tabs: Matches, Players, Stats
- match history
- player cards with photo, name, position, jersey number

Missing design:
- stats tab content
- team metadata/about section
- favorite failure/offline state

### F. Match
Screen:
- Detail Match

Visible data:
- home/away teams
- score
- date/time
- pitch
- competition
- completion status
- goalscorers
- jersey number
- highlight entries
- Play action

Required behavior:
- live/completed/upcoming variants
- event timeline data model
- media/highlights opening
- refresh/live-update strategy

### G. Favorite Team
Screen:
- Team Favorite

Features:
- list favorite teams
- add team via plus
- team name and age category
- navigate to team detail
- remove favorite (assumption; no explicit design)

Selection flow:
- age/group/team bottom sheets can be reused for adding favorites.

### H. Coach Dashboard
Screen:
- Coach Dashboard

Visible:
- list teams assigned to coach
- Tournament Rules
- Pitch

Capabilities:
- authorization by coach role
- select team to manage
- open tournament rules
- open pitch information

Missing:
- rules document format
- pitch/map/detail UI
- team assignment administration

### I. Team Management
Screens:
- Manage Team — Detail
- Manage Team — Player

Setup checklist:
- confirm coach names
- set jersey colours
- register players
- completion progress

Overview:
- max squad size
- players registered
- slots remaining

Players:
- list player cards

Bottom sheets/forms:
- Confirm Coach
- Jersey Colours
- Add Player

Data validations:
- maximum squad size
- required player name
- valid position
- jersey number uniqueness within team
- required home jersey colour
- coach count/rules (business rule to confirm)

### J. Sidebar
Visible menu:
- Favorite Team
- Coach Dashboard
- Logout
- app version

Role behavior:
- hide Coach Dashboard for users without coach permission.

## 3. Screen Inventory

### Supplied screens
1. Login
2. Home Page
3. Sidebar
4. Favorite Team
5. Coach Dashboard
6. Manage Team — Detail
7. Manage Team — Player
8. Team Detail — Matches
9. Match Detail
10. Group Table
11. Group Matches
12. Bottom Sheet — Age
13. Bottom Sheet — Group
14. Bottom Sheet — Team
15. Bottom Sheet — Coach
16. Bottom Sheet — Jersey
17. Bottom Sheet — Add Player

### Referenced but design not supplied
- Schedule full page
- News listing/detail
- Highlights listing/player
- Team Stats content
- Certificate page
- Tournament Rules detail
- Pitch detail
- Notifications page
- Terms page
- Privacy page
- generic error/empty/loading/offline screens

## 4. Reusable UI Components
- AppScreen / SafeArea layout
- Header
- BackButton
- NotificationButton
- BottomNavigation
- SideDrawer
- PrimaryButton
- TextField
- SearchField
- BottomSheetShell
- OptionRow
- TeamRow
- TeamBadge/Crest
- MatchCard
- TeamMatchCard
- PlayerCard
- TeamHero
- TabBar
- ProgressCard
- SetupChecklistItem
- Badge: Live, Position, ContentTag
- SectionHeader
- NewsCard
- EmptyState
- SkeletonLoader
- ErrorState
- ConfirmDialog
- Toast/Snackbar

## 5. Design Tokens from Supplied Style
Representative tokens:
- screen background: `#0A0A0F`
- card/background surfaces: `#141420`, `#0D0D18`, `#1E1E2E`
- primary green: `#3EBF5F`
- active green variant: `#38A956`
- live highlight: `#E8FF4A`
- input surface: `#272B30`
- input border: `#4F575E`
- secondary text examples: `#5A5A70`, `#6B6B80`, `#98A2B3`, `#A0A0B0`
- primary font: Plus Jakarta Sans
- common radii: 12, 16, 20, 24, 48
- reference canvas: 393 × 852

Implementation note: React Native should use responsive layout and safe-area insets rather than reproducing absolute CSS positions.

## 6. Suggested Domain Model
- User
- Role / Permission
- CoachProfile
- AgeGroup
- Competition
- Stage
- Group
- Team
- TeamMembership / CoachTeam
- Player
- TeamSetup
- Jersey
- Venue / Pitch
- Match
- MatchTeam
- MatchEvent
- GoalEvent
- Highlight
- FavoriteTeam
- NewsArticle
- Notification
- Certificate
- TournamentRule

## 7. Development Phases

### Phase 0 — Requirement Closure
- confirm backend ownership
- confirm user roles
- confirm authentication mechanism
- confirm live-match update requirement
- confirm missing screens
- confirm media/video hosting
- confirm favorite behavior
- confirm tournament administration source
- confirm localization and target countries

### Phase 1 — App Foundation & Design System
- RN project
- TypeScript
- routing/navigation
- theme/tokens
- reusable primitives
- API layer
- secure storage
- error boundary
- environment configs
- lint/test/CI

### Phase 2 — Authentication & Shell
- login
- session restore
- logout
- drawer/sidebar
- bottom nav
- route guards
- role guards

### Phase 3 — Public Competition Experience
- Home
- age/group selectors
- group table
- group matches
- team detail
- match detail
- favorite teams

### Phase 4 — Coach Experience
- coach dashboard
- manage team detail
- manage team players
- confirm coaches
- jersey colours
- add/edit/remove player
- setup progress

### Phase 5 — Content & Media
- News
- Highlights
- media player/deep link
- certificate
- tournament rules
- pitch info
- notifications

### Phase 6 — Hardening
- offline/network states
- caching
- performance
- accessibility
- device matrix
- analytics
- crash reporting
- security review
- E2E tests
- store readiness

## 8. Work Breakdown Structure (Engineering)
For every feature:
1. API contract
2. TypeScript model/schema
3. query/mutation hook
4. loading/error/empty state
5. screen UI
6. reusable component extraction
7. validation
8. analytics
9. unit/component test
10. integration/E2E path
11. accessibility review
12. QA acceptance

## 9. Priority
### MVP / P0
- login/logout/session
- navigation
- home
- competition age/group browsing
- standings
- group matches
- team detail matches/players
- match detail
- favorites
- coach dashboard
- manage team setup
- add players

### P1
- stats tab
- news
- highlights
- notifications
- tournament rules
- pitch detail
- certificate

### P2
- offline enhancements
- push notification preferences
- advanced stats
- richer media
- deep links/share
- localization

## 10. Major Product Risks
- Figma represents UI but not full business rules.
- No supplied API/backend contract.
- “Live” experience implies synchronization requirements that are not defined.
- Coach authorization and team assignment rules are not defined.
- Stats, News, Schedule, Highlights, Certificate, Rules and Pitch are referenced but not fully designed.
- Player edit/delete flows and validation states are absent.
- Fixed 393×852 Figma dimensions must not become fixed-layout code.
