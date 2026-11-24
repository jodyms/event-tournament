# Product Requirements Document (PRD)
## Kickzone/TYC Football Tournament Mobile App

### 1. Product Summary
A React Native mobile application for football tournament participants, supporters and coaches. The app provides competition discovery, match and team information, standings, highlights/content, favorites, and a protected coach workspace for maintaining team setup information.

### 2. Problem Statement
Users need a single mobile experience to:
- quickly understand what is happening in the tournament;
- browse age groups, groups, teams, standings and matches;
- follow favorite teams;
- inspect match results/events/highlights;
- allow authorized coaches to complete team setup and player registration.

### 3. Target Users
#### Fan / General User
Can browse public competition information and favorites.

#### Coach
Has all general-user capabilities plus access to Coach Dashboard and team management for assigned teams.

#### Administrator
**Assumption:** likely exists on backend/operational side, but no admin mobile screens are supplied.

### 4. Goals
- Fast access to current and upcoming matches.
- Clear tournament hierarchy from age group to group/stage to team.
- Consistent team and match detail experience.
- Simple favorite-team tracking.
- Frictionless coach setup workflow.
- Pixel-consistent dark visual identity based on supplied Figma.

### 5. Non-Goals for Initial Mobile MVP
Unless separately required:
- full tournament creation/editing
- referee scoring console
- payment
- chat
- social feed creation
- complex statistics engine
- web admin portal

### 6. Primary User Journeys

#### Journey A — Browse Competition
Home → Matches/Teams → Select Age → Select Group/Stage → Group Table/Matches → Team/Match Detail

#### Journey B — Follow Team
Favorite Team → Add → Select Team → Team saved → open team detail

#### Journey C — Inspect Match
Match card → Match Detail → score/events → highlights → play media

#### Journey D — Coach Team Setup
Sidebar → Coach Dashboard → Team → Manage Team → Confirm Coaches / Jersey Colours / Register Players → setup completion increases

### 7. Functional Requirements

#### AUTH-01 Login
- User can enter email and password.
- App validates required fields.
- App authenticates against backend.
- Successful login persists session securely.
- Failed login displays actionable error.
- Terms and Privacy links are accessible.

Acceptance:
- valid credentials route to authenticated home;
- invalid credentials do not create a session;
- reopening app restores valid session;
- expired session returns to login.

#### NAV-01 App Navigation
- Home, Schedule, News are visible as bottom-nav concepts in supplied design.
- Sidebar includes Favorite Team, Coach Dashboard and Logout.
- Coach Dashboard must be role-gated.
- Back behavior follows platform expectations.

#### HOME-01 Hero Content
- Shows current/promoted live or highlight content.
- Supports category/title, image, LIVE state and Play.
- Can open media/content detail.

#### HOME-02 Matches Today
- Shows match cards and status.
- Supports Live, Soon and completed state.
- “View All” opens complete match/schedule view.

#### HOME-03 Quick Navigation
- Matches
- Teams
- Highlights

#### HOME-04 News
- Shows categorized football stories.
- Supports title and estimated read time.
- “See All” opens news list.

#### COMP-01 Age Selection
- User can select supported age group.
- Initial supplied examples: U11, U13, U15.

#### COMP-02 Stage/Group Selection
- Shows group stages and playoff stages.
- Example: U11 Group A, U11 Group B, U11 Cup.

#### COMP-03 Standings
- Display team, played, goal difference and points.
- Sort order is supplied by backend or competition rule engine.
- More groups can be opened.

#### COMP-04 Group Matches
- Display venue, group, date/time, teams and result.
- Match card opens Match Detail.

#### TEAM-01 Team Detail
- Header shows crest, team name and age/group.
- Tabs include Matches, Players, Stats.
- User can favorite/unfavorite team.
- Matches tab shows team fixtures/results.
- Players tab shows photo/name/position/number.
- Stats tab requires additional design/requirements.

#### MATCH-01 Match Detail
- Show teams and score.
- Show date, time, pitch, competition and status.
- Show goalscorers / goal events.
- Show highlights.
- Play action opens supported media.
- For live matches, data refresh mechanism must be defined.

#### FAV-01 Favorite Teams
- User can list favorite teams.
- User can add a team.
- Team selection supports searchable team list.
- User can open favorite team detail.
- Removing favorite is required as a product behavior though explicit delete UI is not supplied.

#### COACH-01 Coach Dashboard
- Coach sees assigned teams.
- Coach can open team management.
- Coach can access Tournament Rules and Pitch information.

#### COACH-02 Team Setup Progress
- Team management shows setup completion.
- Required setup tasks:
  - confirm coach names;
  - set jersey colours;
  - register players.
- Progress is recalculated by backend/business rules.

#### COACH-03 Confirm Coaches
- Coach can enter coach/official names.
- Save persists data.
- Required count and maximum count must be configurable.

#### COACH-04 Jersey Colours
- Coach can set home jersey colour.
- Coach can set away jersey colour.
- Save persists data.

#### COACH-05 Players
- Coach can list registered players.
- Coach can add player name, position and number.
- Player number must be valid and unique within team.
- Squad size cannot exceed configured max.
- Edit/delete behavior should be included in MVP even though corresponding Figma screens are missing, otherwise incorrect data cannot be corrected.

#### SYS-01 Notification Entry Point
- Home includes notification icon.
- Notification listing/content requirements are missing and must be specified before implementation.

#### SYS-02 App Version
- Sidebar shows application version from build metadata.

### 8. Non-Functional Requirements
- iOS and Android supported from one React Native codebase.
- UI adapts to screen size and safe-area insets.
- Cold start and primary navigation should feel responsive on mid-range devices.
- Sensitive auth tokens stored only in secure OS-backed storage.
- API traffic over TLS.
- Graceful offline/error states.
- WCAG-inspired mobile accessibility: labels, focus order, text contrast, touch target sizing.
- Crash reporting and analytics must not log secrets or passwords.
- App must support staged environments: dev, staging, production.

### 9. Data Freshness
Suggested:
- home/news: cache minutes
- standings/completed match: cache short-to-medium
- upcoming match: refresh on screen focus
- live match: polling or realtime channel
- coach mutations: invalidate affected team queries immediately

Exact intervals require backend capacity confirmation.

### 10. Product Analytics
Events:
- login_success / login_failed
- open_home
- open_match
- open_team
- select_age_group
- select_competition_group
- favorite_add / favorite_remove
- video_play
- coach_open_team
- coach_save_names
- coach_save_jersey
- player_add / edit / delete
- setup_completed

### 11. Success Metrics
Suggested, not present in Figma:
- login success rate
- crash-free sessions
- match detail open rate
- favorite adoption
- coach setup completion rate
- median time to complete team setup
- API error rate
- live match data freshness SLA

### 12. Edge Cases
- no matches today
- match postponed/cancelled
- score unavailable
- missing team logo/player photo
- team has no players
- standings not started
- duplicate jersey number
- squad full
- coach loses assignment while screen is open
- expired token during save
- no network
- highlight unavailable
- favorite team removed from competition

### 13. Open Questions / Required Decisions
1. What backend/API already exists?
2. Who creates users and coach accounts?
3. Is self-registration required?
4. Forgot-password flow?
5. Are match scores live? If yes, polling or WebSocket/SSE?
6. Who enters goals/highlights?
7. Which video provider is used?
8. What does Certificate do?
9. What content is under Tournament Rules and Pitch?
10. Are News/Schedule/Profile screens in scope? The design references them.
11. What is the Stats tab definition?
12. Are there push notifications?
13. What are exact squad and coach constraints?
14. Are player photos uploaded by coaches?
15. Is localization required?
