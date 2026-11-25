# Admin Web Figma Adjustment Plan
## TYC / DTYC Admin Web

**Platform:** Web Admin  
**Target Stack:** Next.js + TypeScript + PostgreSQL + Drizzle ORM  
**Purpose:** Menyesuaikan PRD, technical design, data model, API, workflow, dan struktur implementasi Admin Web dengan desain Figma terbaru.  
**Status:** Required adjustment document  

---

# 1. Basis Analisis

Dokumen ini disusun berdasarkan perbandingan antara:

1. `01_IMPLEMENTATION_PLAN.md`
2. `02_PRD.md`
3. `03_TECHNICAL_DESIGN_REACT_NATIVE.md`
4. `04_ADMIN_WEB_PRD_NEXTJS.md`
5. `05_ADMIN_WEB_TECHNICAL_DESIGN_NEXTJS_DRIZZLE.md`
6. `06_MOBILE_APP_ADJUSTMENT_PLAN.md`
7. ZIP desain Figma Web: `DTYC (explore project) web.zip`

ZIP desain berisi 38 screen/frame berikut:

- Dashboard
- Tournaments
- Teams
- Players
- Pitch
- News
- Certificate Template
- Management Notification
- Create Certificate Template
- Team Detail
- Player Detail
- Add New Team
- Tournament Creation Wizard
- Tournament Detail
- Group / Standings
- Match
- Create Match
- Manage Score
- Match Highlight
- Certificate
- Login
- dan variasi/detail screen terkait.

Tujuan dokumen ini bukan mengganti seluruh PRD dan Technical Design lama, tetapi menjadi **dokumen penyesuaian resmi** agar implementasi web mengikuti desain Figma terbaru tanpa menghilangkan business rule dan integritas teknis yang sudah didefinisikan sebelumnya.

---

# 2. Executive Summary

Desain Figma terbaru tidak hanya mengubah tampilan UI, tetapi juga mengubah **Information Architecture** Admin Web.

Pada dokumen sebelumnya, beberapa domain direncanakan sebagai modul/page terpisah seperti:

```text
Age Groups
Stages
Matches
Live Score
Highlights
Rules
Certificates
Reports
Audit
```

Figma terbaru mengonsolidasikan sebagian besar fungsi tersebut ke dalam dua konteks utama:

```text
Tournament Creation Wizard
Tournament Detail
```

Sidebar yang terlihat pada Figma lebih sederhana:

```text
Dashboard
Tournaments
Teams
Players
Pitch
News
Template Certificate
Management Notification
```

Implikasi utama:

- presentation layer / routing harus disesuaikan;
- domain/service backend tetap modular;
- beberapa business rule pada dokumen lama tetap harus dipertahankan meskipun UI-nya tidak ditampilkan secara eksplisit pada Figma;
- terdapat beberapa konflik antara Figma dan existing PRD/Technical Design yang harus diputuskan sebelum implementasi final.

Area paling kritis yang membutuhkan keputusan adalah:

1. Tournament status model.
2. Team dan Sport relationship.
3. Team ownership terhadap Tournament.
4. Coach/Jersey/Player approval granularity.
5. Score vs Goal Event sebagai source of truth.
6. Automatic Schedule scope.
7. Standings edit behavior.
8. Certificate eligibility.
9. RBAC/Admin Account Management.
10. Audit Log.

---

# 3. Revised Information Architecture

## 3.1 Sidebar Utama

Berdasarkan Figma terbaru, sidebar utama direkomendasikan menjadi:

```text
Dashboard
Tournaments
Teams
Players
Pitch
News
Certificate Template
Management Notification
```

Optional jika tetap masuk MVP:

```text
Admin Management
Audit Log
```

Keduanya belum memiliki desain Figma dan harus dibuat desain tambahan jika tetap diwajibkan sebagai UI pada MVP.

---

# 4. Tournament sebagai Context Utama

Modul berikut sebaiknya tidak lagi menjadi top-level sidebar menu:

```text
Age Group
Competition Stage
Tournament Team
Match
Live Score
Match Highlight
Tournament Certificate
Tournament Rule
```

Semua fungsi tersebut lebih sesuai berada di bawah konteks Tournament.

Rekomendasi route:

```text
/tournaments
/tournaments/new
/tournaments/:tournamentId

/tournaments/:tournamentId/groups
/tournaments/:tournamentId/teams
/tournaments/:tournamentId/matches
/tournaments/:tournamentId/highlights
/tournaments/:tournamentId/certificates
```

Technical/domain service tetap modular:

```text
modules/
  tournaments/
  competitions/
  teams/
  coaches/
  players/
  scheduling/
  matches/
  standings/
  content/
  certificates/
  notifications/
  audit/
```

**Decision:** Ubah presentation architecture, bukan menggabungkan seluruh domain logic menjadi satu Tournament module.

---

# 5. Gap Matrix — Figma vs Existing Requirement

| Area | Figma Terbaru | Existing Requirement | Required Adjustment |
|---|---|---|---|
| Login | Username/Email, Password, Remember Me, Change password? | Email/password + Forgot Password | Tentukan support username; ubah wording bila sebenarnya Forgot Password; definisikan remember session |
| Sidebar | 8 menu utama | Sekitar 16 admin modules | Konsolidasikan module ke Tournament context |
| Dashboard | Team, Player, Matches Today, Live Matches | Juga meminta Active Groups | Hapus dari KPI atau tambahkan ke design |
| Dashboard Warning | Player Unregist | Coach/Jersey/Player setup status | Perlu generalized action-needed state |
| Tournament Status | Draft, On Going, Finished, Canceled | Draft, Published, Archived | Pisahkan publication status dan lifecycle status |
| Tournament Creation | 5-step wizard | Module lebih terpisah | Implement draft wizard + save/resume |
| Age | Category/Age terminology | Age Group | Standardisasi terminology |
| Stage | Group Stage / Playoff | Sesuai domain | Pertahankan backend model Stage |
| Pitch | Ada global Pitch dan Tournament Pitch | Belum jelas ownership | Pisahkan venue master dan tournament assignment |
| Rules | Rich text/file di wizard | Versioned/published content | Tambahkan Draft/Publish/versioning |
| Standings | Pos, Team, Match, Win, Lose | Mobile membutuhkan P/GD/PTS | Tambah D/L/GD/PTS sesuai football standing |
| Edit Standing | Ada tombol edit | Standings dihitung backend | Edit hanya manual ranking override |
| Match | Manual create | PRD juga auto schedule | Tambahkan design scheduler atau keluarkan dari MVP |
| Score | Player, Team, Time event | PRD memungkinkan score + events | Tentukan canonical source of truth |
| Team Detail | Information/Setup/Players | Mendukung approval workflow | Approval perlu granular |
| Team Sport | Add team satu sport, detail beberapa sport | Schema satu sport_id | P0 decision single vs multi sport |
| Players | Transfer history tersedia | Sesuai PRD | Tambahkan edit/transfer/deactivate/approval action |
| Highlights | URL video | Requirement juga upload/thumbnail/status/order | Simplify MVP atau update design |
| Certificate | Template global + tournament certificate | Belum sepenuhnya terdefinisi | Pisahkan template vs tournament certificate |
| Notification | Manual send | Requirement manual + automatic | Tambahkan delivery status/history |
| Admin/RBAC | Tidak ada screen | Super Admin/Operator required | Tambahkan design atau pindahkan scope |
| Audit | Tidak ada screen | Required untuk critical operations | Minimal backend audit wajib |
| Reports | Export Data | Requirement Excel/PDF reports | Definisikan target export dan filter |

---

# 6. Tournament Status Model

## 6.1 Problem

Figma menggunakan:

```text
Draft
On Going
Finished
Canceled
```

Existing requirement menggunakan konsep:

```text
Draft
Published
Archived
```

Dua kelompok state tersebut mewakili konsep yang berbeda:

- publication visibility;
- tournament lifecycle.

Jika digabung menjadi satu enum, akan muncul ambiguity seperti:

- apakah `ONGOING` otomatis published?
- apakah `FINISHED` masih terlihat di mobile?
- bagaimana tournament `UPCOMING` tetapi sudah published?
- apakah `DRAFT` berarti belum dimulai atau belum dipublikasi?

## 6.2 Recommended Model

Gunakan dua state terpisah:

```ts
publicationStatus:
  DRAFT
  PUBLISHED
  UNPUBLISHED

lifecycleStatus:
  UPCOMING
  ONGOING
  FINISHED
  CANCELLED
  ARCHIVED
```

Contoh:

```text
Summer Youth Cup
publicationStatus = PUBLISHED
lifecycleStatus = ONGOING
```

## 6.3 Mobile Visibility Rule

Mobile/public API hanya mengembalikan tournament yang:

```text
publicationStatus = PUBLISHED
```

Lifecycle digunakan untuk filter dan display state.

---

# 7. Tournament Creation Wizard

## 7.1 Figma Flow

Figma memperlihatkan alur:

```text
Basic Details
    ↓
Categories
    ↓
Group Stage / Playoff Stage
    ↓
Pitch
    ↓
Rules
```

## 7.2 Required Behavior

Jangan menunggu seluruh wizard selesai lalu membuat satu request besar.

Pada step pertama:

```http
POST /api/v1/admin/tournaments
```

buat Tournament dengan status Draft.

Step berikutnya melakukan update terpisah:

```http
PUT /api/v1/admin/tournaments/:id/basic-info
PUT /api/v1/admin/tournaments/:id/age-groups
PUT /api/v1/admin/tournaments/:id/stages
PUT /api/v1/admin/tournaments/:id/venues
PUT /api/v1/admin/tournaments/:id/rules
```

## 7.3 Draft Progress

Backend dapat menyimpan/derive:

```json
{
  "setupProgress": {
    "basicInfo": true,
    "categories": true,
    "stages": false,
    "venues": false,
    "rules": false
  }
}
```

UI dapat menampilkan:

```text
Tournament Draft
Setup 2 / 5 completed
```

## 7.4 Required UX

- Save draft per step.
- Resume unfinished tournament.
- Back/Next tidak menghapus data step sebelumnya.
- Validation hanya memblok step yang membutuhkan field wajib.
- Publish harus mempunyai final validation seluruh setup.

---

# 8. Age Group / Category / Stage Terminology

Figma menggunakan beberapa istilah:

```text
Category
Age Category
Group
Group Stage
Playoff Stage
Stage
```

Untuk consistency, domain terminology direkomendasikan:

```text
Age Group
Competition Stage
Stage Type
```

Contoh:

```text
Age Group: Under 11
Stage: Group 1
Stage Type: GROUP
```

atau:

```text
Age Group: Under 11
Stage: Quarter Final
Stage Type: PLAYOFF
```

Recommended domain:

```ts
AgeGroup {
  id
  tournamentId
  name
  sortOrder
  active
}

CompetitionStage {
  id
  tournamentId
  ageGroupId
  name
  type: GROUP | PLAYOFF | CUP
  sortOrder
  active
}

StageTeam {
  stageId
  teamId
}
```

Jangan membuat `Group`, `Stage`, dan `Age` sebagai hierarchy terpisah tanpa kebutuhan bisnis yang jelas.

---

# 9. Standings Adjustment

## 9.1 Gap

Figma Group Standings menampilkan:

```text
Pos
Team Name
Match
Win
Lose
```

Existing mobile/backend requirement memerlukan setidaknya:

```text
Played
Goal Difference
Points
```

## 9.2 Recommended Table

Untuk football:

```text
Pos | Team | P | W | D | L | GF | GA | GD | PTS
```

Jika ingin versi compact:

```text
Pos | Team | P | W | D | L | GD | PTS
```

## 9.3 Calculation

Standings harus dihitung backend dari final match result.

Mobile dan Admin UI tidak menghitung standings sendiri.

## 9.4 Edit Standing

Tombol `Edit Standing` tidak boleh mengubah langsung:

```text
wins
losses
goals
points
```

Gunakan sebagai manual ranking override saja:

```text
manualPosition
reason
changedBy
changedAt
```

UI lebih aman menggunakan label:

```text
Edit Ranking Override
```

Semua override wajib memiliki Audit Log.

---

# 10. Match Creation & Scheduling

## 10.1 Manual Match

Figma menyediakan manual create match.

Fields yang direkomendasikan:

```text
Tournament
Age Group
Stage
Home Team
Away Team
Pitch
Start Date
Start Time
Match Duration
```

## 10.2 Buffer Ambiguity

Figma memiliki field `Buffer`, tetapi maknanya belum jelas.

Harus dibedakan menjadi:

```ts
matchDurationMinutes
pitchBufferMinutes
minimumTeamRestMinutes
```

`pitchBufferMinutes` berarti jeda penggunaan pitch.

`minimumTeamRestMinutes` berarti jeda minimal sebelum team yang sama bermain lagi.

## 10.3 Automatic Scheduler Gap

Existing PRD memiliki automatic schedule generation, tetapi Figma hanya memperlihatkan manual Create Match.

Jika automatic scheduler tetap masuk MVP, dibutuhkan screen tambahan:

```text
Manage Match
[Create New Match] [Generate Schedule]
```

Generate form:

```text
Age Group
Stage
Available Pitch
Match Duration
Pitch Buffer
Minimum Team Rest
Start Time
```

Preview:

```text
14 matches generated
2 conflicts

Team A has insufficient rest
Pitch 2 overlaps at 14:30

[Regenerate] [Confirm Schedule]
```

Jika design tambahan tidak dibuat, automatic scheduler harus dipindahkan ke phase berikutnya secara eksplisit.

---

# 11. Match Status

Gunakan enum backend yang konsisten:

```ts
SCHEDULED
LIVE
FINISHED
POSTPONED
CANCELLED
```

Optional:

```ts
DELAYED
ABANDONED
```

Jangan mencampur:

```text
Completed
Finished
Done
```

Gunakan satu terminology lintas Admin, API, dan Mobile.

---

# 12. Score & Goal Event Source of Truth

## 12.1 Current Figma Behavior

Manage Score terlihat berbasis event:

```text
Player
Team
Time
```

Ini menunjukkan Goal Event sebagai bagian utama input score.

## 12.2 Risk

Jika admin juga bebas memasukkan:

```text
Home Score = 3
Away Score = 1
```

sementara goal events hanya menghasilkan:

```text
2 - 1
```

maka data tidak konsisten.

## 12.3 Recommended Football Model

Default:

```text
Goal Events
   ↓
Derived Score
```

Saat match selesai:

```text
validate events
   ↓
derive score
   ↓
finalize match
   ↓
recalculate standings
   ↓
recalculate team statistics
   ↓
audit
   ↓
notification
```

## 12.4 Manual Override

Jika operational requirement membutuhkan koreksi score tanpa detail event lengkap:

```ts
scoreMode: EVENT_DERIVED | MANUAL_OVERRIDE
```

Manual override wajib menyimpan:

```text
reason
changedBy
changedAt
previousScore
newScore
```

---

# 13. Team Setup Approval

## 13.1 Existing Domain Requirement

Coach data bukan langsung official setelah Save.

Canonical workflow:

```text
NOT_STARTED
PENDING
APPROVED
REJECTED
```

Mobile label:

```text
Not Started
Pending Review
Approved
Needs Revision
```

## 13.2 Problem pada Figma

Team Setup menampilkan data seperti:

```text
Main Jersey
Away Jersey
Coach 1
Coach 2
Max Players

Reject
Approve
```

Satu approval untuk seluruh Team Setup terlalu ambigu.

Contoh realistic state:

```text
Coach Names    APPROVED
Jersey         REJECTED
Players        PENDING
```

## 13.3 Recommended UI

Pisahkan per section:

```text
Coach Information
Status: Pending Review
[Reject] [Approve]

Jersey Colours
Status: Needs Revision
[Review]

Player Registration
Status: Pending Review
[Review Players]
```

`Max Squad Size` adalah admin configuration, bukan coach submission.

Jangan memasukkan Max Squad Size ke approval coach.

## 13.4 Backend

Pertahankan independent submission:

```text
coach_name_submissions
jersey_submissions
player_submissions
```

Common fields:

```text
status
submittedBy
submittedAt
reviewedBy
reviewedAt
rejectionReason
revision
```

---

# 14. Rejection Reason

Setiap Reject harus meminta reason.

Recommended dialog:

```text
Reject Submission

Reason *
[________________________________]

[Cancel] [Reject]
```

Backend:

```text
status = REJECTED
rejectionReason
reviewedBy
reviewedAt
```

Mobile harus menerima `rejectionReason` agar coach dapat memperbaiki submission.

---

# 15. Team & Sport Relationship

## 15.1 Figma Conflict

Add New Team memiliki:

```text
Sport *
```

sehingga mengindikasikan satu team memiliki satu sport.

Namun Team Detail memperlihatkan beberapa sport dalam satu team/profile.

Existing schema memiliki satu `sport_id`.

## 15.2 Required Product Decision

### Option A — One Team = One Sport

```text
Football FC
sport = FOOTBALL
```

Recommended untuk MVP karena paling konsisten dengan current database dan competition rules.

### Option B — One Team/Club = Multiple Sports

Dibutuhkan:

```text
teams
sports
team_sports
```

dan banyak domain lain harus ikut berubah.

## 15.3 Dynamic Sport Data

Jangan hard-code daftar sport di UI.

Existing docs memiliki contoh:

```text
Football
Basketball
Baseball
Volleyball
```

Figma juga memperlihatkan Tennis.

Sport harus berasal dari backend master data.

---

# 16. Team Ownership terhadap Tournament

## 16.1 Current Ambiguity

Global `Teams` page memiliki Add New Team, tetapi form tidak selalu memperlihatkan Tournament.

Existing schema mengaitkan Team langsung ke `tournament_id`.

## 16.2 Option A — Tournament-Owned Team

```text
teams
  tournament_id
```

Konsekuensi:

- setiap tournament memiliki record team sendiri;
- team yang sama ikut tournament lain perlu record baru.

Jika model ini dipilih, Add New Team harus meminta Tournament.

## 16.3 Option B — Reusable Team Master

Recommended untuk jangka panjang:

```text
teams
  id
  name
  sport_id

tournament_teams
  tournament_id
  team_id
  age_group_id
  status

stage_teams
  stage_id
  tournament_team_id
```

Keuntungan:

- identitas team tidak diduplikasi;
- transfer/history lebih mudah;
- team dapat ikut banyak tournament.

Namun perubahan ini lebih besar dan harus diputuskan sebelum migration final.

---

# 17. Team Deletion

Figma memiliki `Delete Team`.

Hard delete hanya diperbolehkan jika team belum memiliki dependency operational.

Jika sudah mempunyai:

```text
match
result
player history
approval history
```

maka gunakan:

```text
Deactivate Team
Withdraw Team
```

Recommended behavior:

```text
This team has 6 scheduled matches.
It cannot be permanently deleted.

[Cancel] [Withdraw Team]
```

---

# 18. Player Management

## 18.1 Figma Improvement

Figma sudah memiliki Player Detail dan Transfer History.

Ini harus dipertahankan.

## 18.2 Missing Actions

Dibutuhkan keputusan/design untuk:

```text
Edit Player
Transfer Player
Deactivate Player
Approve Pending Player
Reject Pending Player
```

## 18.3 Actor-Based Workflow

Admin Add Player:

```text
create
→ APPROVED / official
```

Coach Add Player:

```text
create submission
→ PENDING
→ admin review
```

Jangan menggunakan behavior identical tanpa mempertimbangkan actor/permission.

---

# 19. Player Submission Granularity

Figma team player section memiliki pola approval yang belum jelas.

Harus diputuskan apakah:

## Option A — Per Player

Setiap player memiliki:

```text
APPROVED
PENDING
REJECTED
```

Approve/reject dilakukan per row/player.

## Option B — Batch Roster Submission

```text
Player Submission #123

Player A
Player B
Player C

[Reject Submission] [Approve Submission]
```

Data model:

```text
player_submissions
player_submission_items
```

Keputusan ini termasuk P0 karena mempengaruhi database, API, Admin UI, dan Mobile UI.

---

# 20. Pitch / Venue Model

## 20.1 Current Figma

Pitch muncul sebagai:

```text
Sidebar → Pitch
```

serta:

```text
Create Tournament → Pitch
```

## 20.2 Recommended Ownership

Global Pitch adalah master venue:

```text
venues
```

Tournament hanya melakukan assignment:

```text
tournament_venues
  tournament_id
  venue_id
```

Wizard sebaiknya menjadi:

```text
Select Existing Pitch
+ Create New Pitch
```

bukan membuat duplicate venue tanpa relasi.

## 20.3 Venue Fields

```text
name
capacity
address
mapUrl
active
```

Optional:

```text
latitude
longitude
```

---

# 21. Tournament Rules

Figma mendukung:

```text
Rich Text
OR
Upload File
```

Namun harus dibedakan antara Save Draft dan Publish.

Recommended UI:

```text
[Save Draft] [Publish Rules]
```

Recommended model:

```text
tournament_rule_versions
  id
  tournament_id
  version
  content
  file_url
  status
  created_at
  published_at
```

Mobile hanya mengonsumsi latest published version.

---

# 22. News

Figma News sudah cukup sesuai dengan requirement:

```text
Title
Category
Publish Date
Cover Image
Rich Text
Save Draft
Publish News
```

Tambahkan/konfirmasi behavior:

```text
Edit
Preview
Unpublish
Archive/Delete
```

Rich text harus disanitasi server-side sebelum disimpan/dirender.

---

# 23. Match Highlight

## 23.1 Figma

Create Match Highlight memperlihatkan:

```text
Title
Match
Team
Player
URL Video
Preview
```

## 23.2 Gap

Existing requirement sebelumnya juga menyebut:

```text
Thumbnail
File Upload
Sort Order
Publish Status
```

## 23.3 Decision

### MVP Simplification

Jika Figma dianggap final scope:

```text
External video URL only
```

Backend tidak perlu video upload pipeline pada MVP.

### Full Requirement

Jika upload tetap diperlukan, design harus menambahkan:

```text
Source Type
URL / Upload
Thumbnail
Publish Status
Display Order
```

---

# 24. Certificate Model

Figma memperjelas dua entity berbeda.

## 24.1 Global Certificate Template

```text
Template Name
Description
Logo
Certificate Layout
```

Model:

```ts
CertificateTemplate {
  id
  name
  description
  logoAssetId
  layoutAssetId
  active
}
```

## 24.2 Tournament Certificate

```text
Title
Template
Certificate Type
Champion / Participant
Champion Team
Active
```

Model:

```ts
TournamentCertificate {
  id
  tournamentId
  templateId
  title
  type: CHAMPION | PARTICIPANT
  teamId?
  active
}
```

## 24.3 Remaining Product Gap

Participant eligibility belum jelas.

Harus didefinisikan apakah certificate diberikan kepada:

```text
semua player tournament
semua player satu team
semua participant yang approved
individual selected recipients
```

Jangan membangun generator certificate sebelum rule ini ditutup.

## 24.4 Figma Copy Correction

Pada modal Create Certificate terdapat wording yang mengarah ke Match Highlight.

Copy harus diperbaiki menjadi konteks Certificate.

---

# 25. Notification Management

## 25.1 Figma Manual Notification

Figma menyediakan:

```text
Title
Main Content
Send To
Send
```

## 25.2 Platform Requirement

Sistem harus mendukung:

```text
MANUAL
AUTOMATIC
```

Contoh automatic notification:

```text
MATCH_RESCHEDULED
MATCH_STARTED
MATCH_FINISHED
COACH_SUBMISSION_REJECTED
```

## 25.3 Audience

Recommended audience:

```text
ALL_USERS
TEAM_FAVORITES
TEAM_COACHES
SPECIFIC_USERS
```

## 25.4 Delivery State

Management page sebaiknya menampilkan:

```text
Title
Type
Audience
Status
Recipients
Sent
Failed
Created At
Sent At
```

Status:

```text
QUEUED
PROCESSING
SENT
PARTIALLY_FAILED
FAILED
```

Push delivery harus melalui outbox/background worker.

---

# 26. Dashboard Adjustment

## 26.1 KPI

Figma memperlihatkan:

```text
Total Team
Total Player
Matches Today
Live Matches
```

Existing requirement juga menyebut `Active Groups`.

Recommended MVP: gunakan empat KPI yang ada di Figma dan pindahkan Active Groups ke tournament detail/report kecuali product owner meminta card tambahan.

## 26.2 Incomplete Configuration

Jangan membatasi warning hanya menjadi Player Unregistered.

Recommended model:

```text
Team
Coach Status
Jersey Status
Player Status
Overall Action
```

Atau compact display:

```text
Football FC
Needs action: Jersey approval
```

Click harus deep-link ke Team Setup yang membutuhkan action.

---

# 27. Login & Session

## 27.1 Login Identifier

Figma menggunakan:

```text
Username/Email
```

Existing PRD menggunakan email.

P0 decision:

```text
email only
OR
username or email
```

Jika username digunakan, tambahkan unique username pada user schema.

## 27.2 Remember Me

Remember Me tidak menyimpan password secara custom.

Behavior yang disarankan:

```text
rememberMe = false
→ standard session lifetime

rememberMe = true
→ extended session lifetime
```

## 27.3 Change Password Wording

Jika link pada Login sebenarnya adalah recovery flow, gunakan:

```text
Forgot Password?
```

Change Password lebih tepat berada setelah authenticated.

---

# 28. RBAC / Admin Account Management

Existing PRD menetapkan role:

```text
SUPER_ADMIN
OPERATOR
```

Figma belum menyediakan Admin Management UI.

Pilihan implementasi:

## Option A

Tambahkan design Admin Account Management.

## Option B

Untuk MVP, admin account dibuat melalui seed/internal operation dan Admin Management UI dipindahkan ke phase berikutnya.

Apapun pilihannya, server-side authorization tetap wajib.

Hidden menu bukan security control.

---

# 29. Audit Log

Figma belum menyediakan screen audit, tetapi backend audit tetap wajib untuk operasi critical:

```text
score correction
standing override
reschedule
approve/reject
player transfer
team deactivate
publish/unpublish
```

Minimal model:

```text
audit_logs
  id
  actor_user_id
  action
  entity_type
  entity_id
  old_value
  new_value
  reason
  created_at
```

UI Audit Log dapat dipindahkan ke phase berikutnya jika product tidak memasukkannya ke MVP.

---

# 30. Reports & Export

Figma hanya menunjukkan generic `Export Data`.

Scope export harus dibuat eksplisit.

Recommended MVP:

```text
Standings
Match Schedule
Player List
```

Formats:

```text
XLSX
PDF
```

Export harus mengikuti filter/context tournament saat ini.

Contoh:

```text
Tournament: Summer Youth Cup
Age Group: U11
Stage: Group A
```

---

# 31. Recommended Route Structure

```text
src/app/

  (auth)/
    login/
    forgot-password/

  (admin)/
    dashboard/

    tournaments/
      page.tsx
      new/
      [tournamentId]/
        page.tsx
        groups/
        teams/
        matches/
        highlights/
        certificates/

    teams/
      page.tsx
      new/
      [teamId]/

    players/
      page.tsx
      [playerId]/

    venues/
      page.tsx
      new/
      [venueId]/

    news/
      page.tsx
      new/
      [newsId]/

    certificate-templates/
      page.tsx
      new/
      [templateId]/

    notifications/
      page.tsx
      new/

    admin-users/       # optional MVP
    audit/             # optional UI MVP
```

---

# 32. Domain Module Structure

Tidak perlu mengikuti nesting UI secara literal.

Pertahankan modular monolith:

```text
src/modules/
  auth/
  users/
  tournaments/
  competitions/
  teams/
  coaches/
  players/
  scheduling/
  matches/
  standings/
  content/
  certificates/
  notifications/
  audit/
```

Setiap module minimal:

```text
schema.ts
repository.ts
service.ts
validation.ts
permissions.ts
types.ts
tests/
```

Business logic tidak ditempatkan langsung di React component atau route handler.

---

# 33. Database Adjustments

## 33.1 Tournament

Tambahkan/pisahkan:

```text
publication_status
lifecycle_status
```

## 33.2 Tournament Setup

Optional:

```text
tournament_setup_progress
```

atau derive dari completeness data.

## 33.3 Venues

Tambahkan:

```text
tournament_venues
```

## 33.4 Rules

Tambahkan:

```text
tournament_rule_versions
```

## 33.5 Certificate

Pastikan terpisah:

```text
certificate_templates
tournament_certificates
```

## 33.6 Match Score

Tambahkan jika manual override diperlukan:

```text
score_mode
score_override_reason
```

## 33.7 Standings Override

```text
standing_overrides
  stage_id
  team_id
  manual_position
  reason
  changed_by
  created_at
```

## 33.8 Player Approval

Final structure mengikuti keputusan:

```text
per player
```

atau:

```text
player_submissions
player_submission_items
```

## 33.9 Team Master

Jika reusable team dipilih:

```text
teams
tournament_teams
stage_teams
```

Jika tidak, existing `teams.tournament_id` dapat dipertahankan.

---

# 34. API Adjustments

Recommended admin API structure:

```text
/api/v1/admin/dashboard

/api/v1/admin/tournaments
/api/v1/admin/tournaments/:id
/api/v1/admin/tournaments/:id/age-groups
/api/v1/admin/tournaments/:id/stages
/api/v1/admin/tournaments/:id/venues
/api/v1/admin/tournaments/:id/rules
/api/v1/admin/tournaments/:id/teams
/api/v1/admin/tournaments/:id/matches
/api/v1/admin/tournaments/:id/highlights
/api/v1/admin/tournaments/:id/certificates

/api/v1/admin/teams
/api/v1/admin/teams/:id
/api/v1/admin/teams/:id/setup
/api/v1/admin/teams/:id/players

/api/v1/admin/players
/api/v1/admin/players/:id
/api/v1/admin/players/:id/transfers

/api/v1/admin/venues
/api/v1/admin/news
/api/v1/admin/certificate-templates
/api/v1/admin/notifications
```

Approval APIs:

```text
POST /api/v1/admin/submissions/:id/approve
POST /api/v1/admin/submissions/:id/reject
```

atau domain-specific jika authorization/business rule berbeda:

```text
POST /api/v1/admin/coach-submissions/:id/approve
POST /api/v1/admin/jersey-submissions/:id/approve
POST /api/v1/admin/player-submissions/:id/approve
```

Reject payload:

```json
{
  "reason": "Away jersey colour conflicts with home jersey."
}
```

---

# 35. Validation Rules

## Tournament

- end date >= start date;
- publish hanya jika mandatory setup complete;
- published tournament harus memiliki minimal satu age group;
- tournament tidak boleh hard delete jika sudah memiliki operational data.

## Stage

- age group wajib valid untuk tournament;
- team assignment tidak boleh duplicate;
- stage team harus berasal dari tournament yang sama.

## Match

- home team != away team;
- kedua team harus eligible pada tournament/stage;
- pitch harus assigned ke tournament;
- schedule tidak boleh conflict jika business rule melarang;
- finished match harus memiliki valid final result.

## Player

- jersey number valid;
- duplicate jersey number sesuai business rule;
- max squad size enforced server-side;
- transfer harus memiliki history.

## Approval

- Reject wajib reason;
- hanya authorized role dapat review;
- submission yang sudah final tidak boleh direview dua kali tanpa revision workflow.

---

# 36. Concurrency & Transaction Requirements

Workflow berikut wajib transactional:

```text
Finalize Match
Approve Jersey
Approve Coach Data
Approve Player Submission
Transfer Player
Manual Standing Override
```

Contoh finalize match:

```text
BEGIN
  validate current match version
  write final result
  persist events
  recalculate standings
  recalculate statistics
  create audit log
  create notification outbox
COMMIT
```

Gunakan version/updatedAt check untuk menghindari dua operator mengedit match yang sama secara bersamaan.

---

# 37. Mobile Impact

Existing Mobile Adjustment Plan tetap relevan.

Mobile harus tetap menganggap Admin/backend sebagai source of truth untuk:

```text
Tournament
Age Group
Stage
Team
Official Coach
Official Jersey
Approved Players
Schedule
Match Status
Live Score
Goal Events
Standings
Statistics
News
Highlights
Rules
Certificate Availability
Notifications
```

Mobile contract perlu diperbarui setelah keputusan final untuk:

```text
Tournament Status
Team/Sport Model
Player Approval Granularity
Certificate Eligibility
Score/Event Model
```

---

# 38. Recommended Implementation Priority

## P0 — Must Decide Before Core Implementation

1. Final Information Architecture.
2. Tournament publication/lifecycle status.
3. Team ↔ Sport cardinality.
4. Team ↔ Tournament ownership.
5. Coach/Jersey/Player approval granularity.
6. Player submission per-player vs batch.
7. Score vs Goal Event source of truth.
8. Standings columns and manual override behavior.
9. Automatic scheduler MVP scope.
10. Venue master vs Tournament Venue relationship.
11. Certificate eligibility.
12. RBAC/Admin Management MVP scope.
13. Audit UI vs backend-only MVP.

## P1 — Build After P0 Freeze

1. Authentication shell.
2. Sidebar and page layout.
3. Dashboard.
4. Tournament list.
5. Tournament wizard.
6. Tournament Detail tabs.
7. Team management.
8. Player management.
9. Pitch/Venue.
10. News.
11. Highlight.
12. Certificate Template.
13. Tournament Certificate.
14. Notification Management.

## P2 — Operational Hardening

1. Export/reporting.
2. Audit Log UI.
3. Automatic scheduler if deferred.
4. Extended notification delivery diagnostics.
5. Advanced role management.
6. Conflict and concurrency UX.
7. Bulk operations.

---

# 39. Screen-Level Development Readiness

## Safe to Start

Screen yang relatif aman dikerjakan lebih awal:

```text
Login visual shell
Admin layout/sidebar
Dashboard layout
Tournament list
Generic data table
Generic modal/dialog
Generic form components
News UI
Pitch list/detail UI
Certificate Template UI
```

## Must Wait for Product Decision

Jangan mengunci data/API implementation untuk:

```text
Tournament status
Tournament publish flow
Team/Sport relationship
Team/Tournament ownership
Team Setup approval
Player approval
Match score/finalization
Standing override
Automatic scheduling
Certificate recipient generation
Admin role management
```

---

# 40. Recommended Design System Components

Agar 38 Figma screen tidak menghasilkan duplicate component, buat reusable components:

```text
AdminShell
Sidebar
TopBar
PageHeader
Breadcrumb
KpiCard
DataTable
TableToolbar
FilterBar
Pagination
StatusBadge
ActionMenu
Tabs
FormField
SelectField
DatePicker
TimePicker
UploadField
RichTextEditor
Modal
ConfirmDialog
ApprovalDialog
RejectDialog
EmptyState
ErrorState
Skeleton
Toast
Stepper
WizardFooter
```

Domain components:

```text
TournamentStatusBadge
TournamentWizard
StageTable
StandingTable
MatchTable
MatchScoreEditor
TeamSetupReview
PlayerTable
TransferHistory
VenueSelector
RuleEditor
CertificateTemplatePicker
NotificationAudienceSelector
```

---

# 41. Recommended Status Tokens

Gunakan semantic status, bukan warna yang di-hard-code per page:

```text
success
warning
error
info
neutral
```

Mapping example:

```text
APPROVED   → success
PENDING    → warning
REJECTED   → error
LIVE       → success/live
DRAFT      → neutral
CANCELLED  → error
FINISHED   → info/neutral
```

---

# 42. Required Additional Figma / Product Clarification

Desain tambahan atau decision document diperlukan untuk:

1. Forgot Password.
2. Admin Management / Role Management jika masuk MVP.
3. Audit Log jika masuk MVP UI.
4. Automatic Schedule Generation.
5. Reject Reason dialog.
6. Granular Team Setup approval.
7. Player approve/reject behavior.
8. Player Transfer form.
9. Standing ranking override.
10. Notification delivery history/status.
11. Certificate recipient/eligibility.
12. Tournament publish confirmation/validation.
13. Match finalization and manual score override.
14. Resume Draft Tournament.

---

# 43. Acceptance Criteria for Figma Alignment

Admin Web dianggap aligned dengan Figma dan platform requirement jika:

- sidebar dan primary navigation mengikuti approved Figma;
- Tournament creation menggunakan multi-step wizard;
- unfinished Tournament dapat disimpan sebagai draft;
- Tournament Detail mengelola Group, Team, Match, Highlight, dan Certificate dalam context Tournament;
- Age Group, Stage, Team, Pitch dan related data berasal dari backend;
- standings berasal dari backend calculation;
- manual ranking override dapat diaudit;
- live/final score tidak menghasilkan konflik dengan Goal Event;
- approval coach, jersey, player dapat direpresentasikan secara independen;
- rejection mempunyai reason;
- venue master tidak diduplikasi secara tidak terkontrol;
- News memiliki draft/publish workflow;
- Rules memiliki draft/publish/version behavior;
- Notification mempunyai recipient/audience dan delivery state;
- destructive delete dibatasi pada entity yang sudah mempunyai operational history;
- semua critical mutation mempunyai server-side permission dan audit trail;
- mobile tetap menerima canonical approved/published data dari backend.

---

# 44. Final Recommendation

Desain Figma terbaru dapat dijadikan baseline utama untuk **presentation layer**, tetapi tidak boleh menjadi satu-satunya sumber untuk business rules dan data integrity.

Pendekatan final yang direkomendasikan:

```text
Figma
→ source of truth untuk user flow, layout, interaction placement, dan navigation

PRD
→ source of truth untuk product behavior dan acceptance criteria

Technical Design
→ source of truth untuk architecture, data integrity, security, transaction, dan integration

Backend
→ source of truth untuk official tournament data
```

Sebelum coding core module dimulai, semua keputusan P0 pada dokumen ini harus ditutup dan kemudian diikuti dengan update pada:

```text
04_ADMIN_WEB_PRD_NEXTJS.md
05_ADMIN_WEB_TECHNICAL_DESIGN_NEXTJS_DRIZZLE.md
06_MOBILE_APP_ADJUSTMENT_PLAN.md
```

Setelah ketiga dokumen tersebut sinkron, implementasi dapat dilanjutkan dengan risiko rework yang jauh lebih rendah.

---

# 45. Decision Checklist

Gunakan checklist berikut saat Product/Tech review:

- [ ] Final sidebar/navigation approved.
- [ ] Tournament publication status approved.
- [ ] Tournament lifecycle status approved.
- [ ] Team single-sport vs multi-sport approved.
- [ ] Team global vs tournament-owned approved.
- [ ] Team Setup approval granularity approved.
- [ ] Player approval per-player vs batch approved.
- [ ] Score/event source of truth approved.
- [ ] Manual score override behavior approved.
- [ ] Standings fields approved.
- [ ] Manual ranking override behavior approved.
- [ ] Automatic scheduler MVP decision approved.
- [ ] Pitch/Venue ownership approved.
- [ ] Rules publish/version behavior approved.
- [ ] Highlight URL-only vs upload approved.
- [ ] Certificate eligibility approved.
- [ ] Notification automatic events approved.
- [ ] Admin Management MVP scope approved.
- [ ] Audit UI scope approved.
- [ ] Export/report MVP scope approved.

