# Graph Report - event-tournament  (2026-09-02)

## Corpus Check
- 75 files · ~98,818 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 450 nodes · 709 edges · 38 communities (29 shown, 8 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 48 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- UI Component Library
- Runtime Dependencies
- Product Requirements
- Expo App Configuration
- Implementation Plan
- Domain Type Models
- Development Tooling
- Screen Components
- Package Scripts
- Match Detail Mockup
- Team Match Mockup
- Application Architecture
- TypeScript Configuration
- Coach Dashboard Mockup
- Standings Table Mockup
- Team Picker Mockup
- Home Dashboard Mockup
- Team Player Mockup
- Team Setup Mockup
- Group Matches Mockup
- Jersey Form Mockup
- Player Form Mockup
- Coach Form Mockup
- Stage Picker Mockup
- Login Mockup
- Sidebar Mockup
- Age Picker Mockup
- Favorite Teams Mockup
- REST API Boundary
- README Run Guide
- Android Icon Background
- Android Icon Foreground
- Android Monochrome Icon
- Favicon Asset
- App Logo Asset
- Splash Asset
- Quality Commands

## God Nodes (most connected - your core abstractions)
1. `useAppStore` - 20 edges
2. `colors` - 17 edges
3. `spacing` - 15 edges
4. `fonts` - 15 edges
5. `radius` - 14 edges
6. `Screen()` - 13 edges
7. `AppHeader()` - 13 edges
8. `RootStackParamList` - 13 edges
9. `expo` - 12 edges
10. `teamById()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Coach Experience` --semantically_similar_to--> `Coach Team Setup`  [INFERRED] [semantically similar]
  01_IMPLEMENTATION_PLAN.md → 02_PRD.md
- `Stage and Group Selection Sheet` --implements--> `Competition Browsing`  [INFERRED]
  figma/Bottom Sheet age.pdf → 02_PRD.md
- `Age Group Selection Sheet` --implements--> `Competition Browsing`  [INFERRED]
  figma/Bottom Sheet Group.pdf → 02_PRD.md
- `Jersey Colours Form` --implements--> `Coach Team Setup`  [INFERRED]
  figma/Bottom Sheet-1.pdf → 02_PRD.md
- `Confirm Coach Form` --implements--> `Coach Team Setup`  [INFERRED]
  figma/Bottom Sheet.pdf → 02_PRD.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Public Competition Browse Flow** — figma_home_page_home_dashboard, figma_bottom_sheet_group_age_group_selection, figma_bottom_sheet_age_stage_group_selection, figma_table_group_group_standings, figma_matches_group_group_matches, figma_detail_match_match_detail [INFERRED 0.85]
- **Favorite Team Add Flow** — figma_sidebar_side_drawer, figma_favorite_team_favorite_team_list, figma_bottom_sheet_group_age_group_selection, figma_bottom_sheet_age_stage_group_selection, figma_bottom_sheet_team_team_selection [INFERRED 0.85]
- **Coach Team Setup Flow** — figma_coach_dashboard_coach_dashboard, figma_manage_team_team_setup, figma_manage_team_setup_checklist, figma_bottom_sheet_confirm_coach_form, figma_bottom_sheet_1_jersey_colours_form, figma_bottom_sheet_2_add_player_form, figma_manage_team_1_player_roster [INFERRED 0.95]
- **Available Age Group Choices** — mockup_bottom_sheet_group_under_11, mockup_bottom_sheet_group_under_13, mockup_bottom_sheet_group_under_15 [EXTRACTED 1.00]
- **Selectable U11 Team Rows** — mockup_bottom_sheet_team_kickball_fc, mockup_bottom_sheet_team_soccer_stars, mockup_bottom_sheet_team_basketball_blazers, mockup_bottom_sheet_team_baseball_bears, mockup_bottom_sheet_team_volleyball_vipers [EXTRACTED 1.00]
- **Under 11 Competition Paths** — mockup_bottom_sheet_age_u11_group_a, mockup_bottom_sheet_age_u11_group_b, mockup_bottom_sheet_age_u11_cup [EXTRACTED 1.00]
- **Football FC Jersey Configuration** — mockup_bottom_sheet_1_football_fc, mockup_bottom_sheet_1_home_jersey_colour, mockup_bottom_sheet_1_away_jersey_colour, mockup_bottom_sheet_1_save_action [EXTRACTED 1.00]
- **New Player Record** — mockup_bottom_sheet_2_player_name, mockup_bottom_sheet_2_player_position, mockup_bottom_sheet_2_player_number, mockup_bottom_sheet_2_save_player_action [EXTRACTED 1.00]
- **Team Coach Confirmation** — mockup_bottom_sheet_coach_1, mockup_bottom_sheet_coach_2, mockup_bottom_sheet_coach_pass_recipient, mockup_bottom_sheet_save_coaches_action [EXTRACTED 1.00]
- **Manageable Teams** — mockup_coach_dashboard_football_fc, mockup_coach_dashboard_kickball_fc, mockup_coach_dashboard_longball_fc [EXTRACTED 1.00]
- **Age-Banded Team Management** — mockup_coach_dashboard_u11, mockup_coach_dashboard_u17, mockup_coach_dashboard_u19, mockup_coach_dashboard_select_team_to_manage [INFERRED 0.95]
- **Football FC vs Kickball FC Match Summary** — mockup_detail_match_football_fc, mockup_detail_match_kickball_fc, mockup_detail_match_score_6_1, mockup_detail_match_match_schedule, mockup_detail_match_stadium_pitch_2, mockup_detail_match_u11_group_a [EXTRACTED 1.00]
- **Goal Attribution** — mockup_detail_match_goals_section, mockup_detail_match_ziqri_z, mockup_detail_match_zuhri, mockup_detail_match_goal_adjustment_controls [INFERRED 0.95]
- **Team Detail Navigation** — mockup_detail_team_matches_matches_tab, mockup_detail_team_matches_players_tab, mockup_detail_team_matches_stats_tab [EXTRACTED 1.00]
- **Kickball FC Match History** — mockup_detail_team_matches_kickball_fc, mockup_detail_team_matches_football_fc_6_kickball_fc_1, mockup_detail_team_matches_kickball_fc_4_longball_fc_0, mockup_detail_team_matches_stadium_pitch_1, mockup_detail_team_matches_08_00_sat_18_july [EXTRACTED 1.00]
- **Dashboard Content Discovery Flow** — mockup_home_page_live_match_report, mockup_home_page_matches_today_carousel, mockup_home_page_quick_actions [EXTRACTED 1.00]
- **Roster Information Pattern** — mockup_manage_team_1_player_card, mockup_manage_team_1_player_position_badge, mockup_manage_team_1_jersey_number [EXTRACTED 1.00]
- **Team Setup Checklist** — mockup_manage_team_confirm_coach_names, mockup_manage_team_set_jersey_colours, mockup_manage_team_register_players [EXTRACTED 1.00]
- **Match Summary Pattern** — mockup_matches_group_match_venue, mockup_matches_group_match_schedule, mockup_matches_group_team_matchup, mockup_matches_group_match_score [EXTRACTED 1.00]
- **Primary Drawer Actions** — mockup_sidebar_favorite_team_navigation, mockup_sidebar_coach_dashboard_navigation, mockup_sidebar_logout_action [EXTRACTED 1.00]
- **Standings Metrics** — mockup_table_group_matches_played_metric, mockup_table_group_goal_difference_metric, mockup_table_group_points_metric [EXTRACTED 1.00]
- **Kickzone Application Architecture** — readme_feature_modules, readme_reusable_ui_components, readme_dark_theme_design_tokens, readme_mock_data_module, readme_rest_api_client [EXTRACTED 1.00]
- **Project Validation Workflow** — readme_development_commands, readme_quality_checks, readme_android_expo_go, readme_demo_account_validation [EXTRACTED 1.00]

## Communities (38 total, 8 thin omitted)

### Community 0 - "UI Component Library"
Cohesion: 0.08
Nodes (56): AppHeader(), Badge(), EmptyState(), IconButton(), IconName, MatchCard(), matchFromId(), PrimaryButton() (+48 more)

### Community 1 - "Runtime Dependencies"
Cohesion: 0.05
Nodes (43): expo, expo-font, @expo-google-fonts/plus-jakarta-sans, expo-linear-gradient, expo-secure-store, expo-splash-screen, expo-status-bar, @expo/vector-icons (+35 more)

### Community 2 - "Product Requirements"
Cohesion: 0.10
Nodes (27): Coach Team Setup, Favorite Teams, Mobile Non-Functional Requirements, Primary User Journeys, Kickzone Product Requirements, Secure Authentication, Target Users, Mobile API Strategy (+19 more)

### Community 3 - "Expo App Configuration"
Cohesion: 0.08
Nodes (25): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, expo (+17 more)

### Community 4 - "Implementation Plan"
Cohesion: 0.10
Nodes (25): Coach Experience, Development Phases, Kickzone/TYC Mobile App, Product Modules, Major Product Risks, Public Competition Experience, Responsive Design System, Competition Browsing (+17 more)

### Community 5 - "Domain Type Models"
Cohesion: 0.14
Nodes (19): App(), navigationTheme, queryClient, styles, initialPlayers, standings, ID, Match (+11 more)

### Community 6 - "Development Tooling"
Cohesion: 0.10
Nodes (21): eslint, @eslint/js, eslint-plugin-react-hooks, jest, jest-expo, devDependencies, eslint, @eslint/js (+13 more)

### Community 7 - "Screen Components"
Cohesion: 0.16
Nodes (14): TextField(), LoginScreen(), styles, loginSchema, LoginValues, CoachSheet(), DetailTab(), JerseySheet() (+6 more)

### Community 8 - "Package Scripts"
Cohesion: 0.11
Nodes (17): jest, preset, testPathIgnorePatterns, /graphify-out/, main, name, private, scripts (+9 more)

### Community 9 - "Match Detail Mockup"
Cohesion: 0.15
Nodes (13): Football FC, Goal Adjustment Controls, Goals Section, Jersey #15, Jersey #8, Kickball FC, Match Detail Screen, 08:00 - Sat 18 July (+5 more)

### Community 10 - "Team Match Mockup"
Cohesion: 0.18
Nodes (13): 08:00 Sat 18 July, Favorite Team Action, Football FC, Football FC 6-1 Kickball FC, Kickball FC, Kickball FC 4-0 Longball FC, Kickball FC Team Detail, Longball FC (+5 more)

### Community 11 - "Application Architecture"
Cohesion: 0.17
Nodes (13): API Contract Availability, REST API /api/v1, Backend Secret Bundle Safety, Mockup-Derived Dark Theme Tokens, EXPO_PUBLIC_API_URL Configuration, Fan and Coach Tournament Experience, Feature Modules, Kickzone Tournament Mobile (+5 more)

### Community 12 - "TypeScript Configuration"
Cohesion: 0.17
Nodes (11): expo/tsconfig.base, figma, jest, mockup, compilerOptions, noUncheckedIndexedAccess, strict, types (+3 more)

### Community 13 - "Coach Dashboard Mockup"
Cohesion: 0.20
Nodes (10): Coach Dashboard, Football FC, Kickball FC, Longball FC, Pitch, Select a Team to Manage, Tournament Rules, U11 (+2 more)

### Community 14 - "Standings Table Mockup"
Cohesion: 0.22
Nodes (9): Goal Difference Metric, Group Standings Table, U11 Group A Table Screen, Rotate Device Table Hint, Matches Played Metric, More U11 Groups Navigation, Points Metric, Table and Matches Tabs (+1 more)

### Community 15 - "Team Picker Mockup"
Cohesion: 0.39
Nodes (8): Baseball Bears, Basketball Blazers, Kickball FC, Search Team Field, Soccer Stars, Team Selection Bottom Sheet, U11 Age Badge, Volleyball Vipers

### Community 16 - "Home Dashboard Mockup"
Cohesion: 0.29
Nodes (7): Certificate Action, Home Dashboard, Live Match Report, Match Engagement Metrics, Matches Today Carousel, Home Schedule News Navigation, Matches Teams Highlights Quick Actions

### Community 17 - "Team Player Mockup"
Cohesion: 0.29
Nodes (7): Detail and Player Tabs, Jersey Number, Player Card, Player Position Badge, Player Roster, Team Identity Hero, Team Player Screen

### Community 18 - "Team Setup Mockup"
Cohesion: 0.29
Nodes (7): Confirm Coach Names, Detail and Player Tabs, Register Players, Set Jersey Colours, Team Detail Screen, Team Overview, Team Setup Progress

### Community 19 - "Group Matches Mockup"
Cohesion: 0.29
Nodes (7): U11 Group A Matches Screen, Group Match Card, Match Date and Time, Match Score, Match Venue, Table and Matches Tabs, Team Matchup

### Community 20 - "Jersey Form Mockup"
Cohesion: 0.40
Nodes (6): Away Jersey Colour, Football FC, Home Jersey Colour, Jersey Colours Form, Save Action, Yellow

### Community 21 - "Player Form Mockup"
Cohesion: 0.40
Nodes (6): Add Player Form, Player Name, Player Number, Player Position, Save Player Action, Sultan shikii

### Community 22 - "Coach Form Mockup"
Cohesion: 0.33
Nodes (6): Abu Yunandar, Coach 1, Coach 2, Coach Pass Recipient, Confirm Coach Form, Save Coaches Action

### Community 23 - "Stage Picker Mockup"
Cohesion: 0.33
Nodes (6): Group Stages, Playoff Stages, U11 Cup, U11 Group A, U11 Group B, Under 11 Stage Selection

### Community 24 - "Login Mockup"
Cohesion: 0.33
Nodes (6): Terms of Service and Privacy Policy Consent, Login Action, Email and Password Form, Login Screen, Onboarding Pagination Indicator, Sports Hero Image

### Community 25 - "Sidebar Mockup"
Cohesion: 0.33
Nodes (6): Application Version, Coach Dashboard Navigation, Favorite Team Navigation, Logout Action, Navigation Drawer, TYC Brand

### Community 26 - "Age Picker Mockup"
Cohesion: 0.40
Nodes (5): Age Group Selection Bottom Sheet, Forward Navigation Affordance, Under 11, Under 13, Under 15

### Community 27 - "Favorite Teams Mockup"
Cohesion: 0.40
Nodes (5): Add Team Action, Age Division Badge, Favorite Team List, Team Detail Navigation, Team Favorite Screen

### Community 29 - "README Run Guide"
Cohesion: 0.67
Nodes (3): Android Expo Go Launch, Demo Account Validation, Development Commands

## Knowledge Gaps
- **196 isolated node(s):** `queryClient`, `navigationTheme`, `styles`, `name`, `slug` (+191 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 219 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo-secure-store` connect `Expo App Configuration` to `Domain Type Models`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `queryClient`, `navigationTheme`, `styles` to the rest of the system?**
  _196 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Component Library` be split into smaller, more focused modules?**
  _Cohesion score 0.08191808191808192 - nodes in this community are weakly interconnected._
- **Should `Runtime Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `Product Requirements` be split into smaller, more focused modules?**
  _Cohesion score 0.09686609686609686 - nodes in this community are weakly interconnected._
- **Should `Expo App Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `Implementation Plan` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._