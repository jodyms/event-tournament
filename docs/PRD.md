# Product Requirements Document — Kickzone Tournament Platform

| Atribut | Nilai |
|---|---|
| Produk | Kickzone Tournament Platform |
| Cakupan | Aplikasi mobile fan/coach, portal admin, dan API mobile |
| Versi dokumen | 1.0 |
| Tanggal | 22 September 2026 |
| Status | Baseline implementasi + target rilis terintegrasi |
| Sumber kebenaran | Implementasi di `src/` dan `apps/web/src/`, schema Drizzle, migrasi, pengujian, serta mockup di `figma/` dan `mockup/` |

## 1. Ringkasan produk

Kickzone adalah platform operasional turnamen olahraga dengan fokus implementasi awal pada sepak bola. Produk terdiri dari:

1. aplikasi mobile Expo/React Native untuk fan, pengguna umum, dan coach;
2. portal admin Next.js untuk pengelolaan turnamen, peserta, jadwal, skor, konten, dan akun;
3. REST API `/api/v1` dan PostgreSQL sebagai sumber data terpusat.

Nilai utama produk adalah menyatukan pengalaman publik dan operasi turnamen. Admin menjaga data resmi; coach mengajukan data tim untuk ditinjau; fan memperoleh jadwal, klasemen, skor, berita, dan informasi tim yang sudah dipublikasikan.

Implementasi saat ini sudah menyediakan UI mobile yang dapat dijelajahi, portal admin berbasis database, API publik/terautentikasi, approval flow, audit log, dan outbox job. Namun mobile masih memakai fallback data lokal apabila `EXPO_PUBLIC_API_URL` tidak tersedia, dan beberapa kontrak mobile belum sepenuhnya selaras dengan respons API aktual.

## 2. Masalah yang diselesaikan

Operasi turnamen sering tersebar di spreadsheet, pesan pribadi, dan pembaruan manual. Akibatnya:

- fan kesulitan menemukan jadwal, hasil, klasemen, dan informasi tim yang konsisten;
- coach tidak memiliki jalur formal untuk mengirim dan memperbaiki data tim;
- operator berisiko membuat jadwal bentrok atau memperbarui skor tanpa jejak audit;
- informasi publik dapat berbeda dari data operasional;
- koreksi hasil, approval roster, dan publikasi konten sulit ditelusuri.

Kickzone menyediakan satu sumber kebenaran dengan workflow terkontrol dan tampilan yang disesuaikan untuk setiap peran.

## 3. Tujuan dan indikator keberhasilan

### 3.1 Tujuan produk

- Menyediakan informasi turnamen yang cepat, akurat, dan mudah dinavigasi di mobile.
- Memungkinkan coach mengelola persiapan tim melalui proses submit–review–revise.
- Memungkinkan operator menjalankan turnamen dari setup hingga finalisasi hasil.
- Menjamin hanya data berstatus publik/approved yang muncul kepada fan.
- Menyediakan kontrol akses, validasi, transaksi, dan audit untuk tindakan sensitif.

### 3.2 KPI utama

| Area | KPI target rilis |
|---|---|
| Reliabilitas data | 100% skor final dan approval sensitif memiliki audit trail |
| Freshness | Data pertandingan live tampil di mobile maksimum 30 detik setelah perubahan |
| Operasional | Tidak ada dua pertandingan yang memakai pitch/tim yang sama pada waktu tumpang tindih |
| Coach workflow | ≥90% submission dapat diselesaikan tanpa bantuan operator di luar aplikasi |
| API | ≥99,5% availability bulanan, di luar maintenance terjadwal |
| Performa | p95 endpoint read utama <500 ms pada beban target yang disepakati |
| Kualitas | Seluruh acceptance test P0 lulus sebelum rilis produksi |
| Keamanan | 0 secret produksi di bundle mobile atau repository |

Angka adopsi seperti MAU, jumlah favorit, dan engagement berita harus mulai direkam setelah analytics production tersedia; belum ada analytics provider pada implementasi saat ini.

## 4. Persona dan hak akses

### 4.1 Fan / pengguna umum

Mencari jadwal, tim, klasemen, hasil, berita, highlight, venue, peraturan, notifikasi, dan sertifikat. Dapat menyimpan tim favorit setelah login.

### 4.2 Coach

Memiliki seluruh kemampuan pengguna umum dan hanya dapat mengelola tim yang ditugaskan kepadanya. Coach mengajukan nama coach, warna jersey, dan pemain; perubahan menjadi resmi setelah approval admin.

### 4.3 Operator

Menjalankan operasi sehari-hari: membaca turnamen, mengelola tim sesuai permission, memproses submission, menyusun jadwal, memperbarui skor, menerbitkan konten, mengirim notifikasi, dan membaca audit sesuai RBAC. Operator tidak boleh mengelola akun admin atau mengoreksi skor final bila aturan membutuhkan Super Admin.

### 4.4 Super Admin

Memiliki seluruh permission, dapat mengelola akun/role admin, mengubah konfigurasi turnamen, melakukan tindakan sensitif yang dibatasi, serta mengoreksi hasil final dengan audit.

## 5. Prinsip produk

- **Sumber kebenaran tunggal:** PostgreSQL adalah data resmi ketika integrasi aktif.
- **Publish explicitly:** draft tidak boleh muncul di endpoint publik.
- **Approval before official:** data usulan coach tidak langsung menimpa data resmi.
- **Least privilege:** semua aksi admin dan coach dibatasi permission/assignment.
- **Traceable changes:** tindakan sensitif menghasilkan audit record.
- **Safe demo mode:** fallback lokal membantu demonstrasi, tetapi harus jelas dibedakan dari mode production.
- **Football-first, extensible later:** schema mengenal sport, tetapi aturan skor/klasemen saat ini khusus sepak bola.

## 6. Ruang lingkup

### 6.1 Dalam lingkup rilis terintegrasi

- autentikasi admin dan mobile, refresh token, logout, dan reset password;
- beranda mobile, kompetisi, jadwal, detail pertandingan, tim, favorit, berita, dan content entry points;
- coach dashboard dan submission data tim;
- tournament, age group, stage, venue/pitch, team, player, dan coach assignment;
- jadwal manual dan round-robin, deteksi bentrok, live score, finalisasi, dan koreksi;
- klasemen serta statistik tim terhitung;
- news, highlight metadata, rules, notification, dan certificate;
- RBAC, audit log, outbox job, pagination, filtering dasar, dan error envelope.

### 6.2 Di luar lingkup MVP

- pembayaran, ticketing, marketplace, dan monetisasi;
- chat langsung fan–coach–admin;
- video transcoding/streaming internal;
- bracket editor visual tingkat lanjut;
- realtime berbasis WebSocket (polling digunakan pada rilis awal);
- dukungan aturan penuh untuk basket, baseball, dan voli;
- multi-tenant organisasi yang terisolasi;
- integrasi push/email production tertentu sebelum provider dipilih.

## 7. User journey utama

### 7.1 Fan mengikuti pertandingan

1. Pengguna login.
2. Beranda menampilkan pertandingan live/upcoming dan berita terbaru.
3. Pengguna membuka detail pertandingan.
4. Saat status `LIVE`, aplikasi memperbarui data secara berkala.
5. Pengguna dapat membuka detail tim, event gol, atau highlight yang dipublikasikan.

### 7.2 Fan menelusuri kompetisi

1. Pengguna memilih age group dinamis.
2. Pengguna memilih stage/group yang dipublikasikan.
3. Pengguna berpindah antara klasemen dan daftar pertandingan.
4. Pengguna membuka tim atau pertandingan dari daftar.

### 7.3 Coach menyiapkan tim

1. Coach login dan melihat hanya tim yang ditugaskan.
2. Coach membuka status setup dan kuota roster.
3. Coach mengirim nama coach, jersey, atau data pemain.
4. Submission berstatus `PENDING` dan data resmi tidak berubah.
5. Admin menyetujui atau menolak dengan alasan.
6. Coach melihat status terbaru dan mengirim revisi bila ditolak.

### 7.4 Operator menjalankan pertandingan

1. Operator membuat fixture atau menghasilkan round-robin.
2. Sistem menolak bentrok tim/pitch.
3. Operator mengubah pertandingan dari `SCHEDULED` menjadi `LIVE`.
4. Operator mengisi hasil dan event, lalu melakukan konfirmasi finalisasi.
5. Sistem menyimpan hasil, menghitung ulang klasemen/statistik, membuat audit, dan menulis event ke outbox dalam satu transaksi.

### 7.5 Admin menerbitkan konten

1. Admin membuat draft berita/rules/media metadata.
2. Admin memeriksa isi lalu menerbitkannya.
3. Hanya versi `PUBLISHED` yang dapat dibaca mobile.
4. Perubahan pada berita yang sudah terbit dibuat sebagai draft revisi agar versi publik tetap stabil.

## 8. Functional requirements

Prioritas: **P0** wajib untuk rilis terintegrasi, **P1** penting setelah baseline stabil, **P2** peningkatan.

### 8.1 Authentication dan session

| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| AUTH-01 | P0 | Pengguna mobile dapat login dengan email/password. | Kredensial valid menghasilkan user, access token 15 menit, refresh token 30 hari; error invalid tidak membocorkan keberadaan akun. |
| AUTH-02 | P0 | Token mobile dapat dirotasi. | Refresh token valid hanya dapat digunakan sekali; token lama ditandai revoked. |
| AUTH-03 | P0 | Admin login melalui session cookie. | Cookie `httpOnly`, `sameSite=lax`, `secure` di production; idle timeout 30 menit diperbarui saat digunakan. |
| AUTH-04 | P0 | Sistem membatasi percobaan login. | Setelah lima percobaan gagal dalam window 15 menit, sistem mengembalikan 429. Production harus memakai shared rate-limit store. |
| AUTH-05 | P0 | Reset password tidak mengungkap apakah email terdaftar. | Request selalu memberi respons accepted; token berlaku satu jam, single-use, dan reset membatalkan session admin aktif. |
| AUTH-06 | P0 | Logout menghentikan session. | Admin session dihapus server-side; mobile refresh token direvoke pada implementasi production. |

### 8.2 Mobile — home dan navigasi

| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| MOB-01 | P0 | Navigasi utama menyediakan Home, Schedule, dan News. | Tab dapat diakses setelah login; layar detail menggunakan stack; menu dan coach area sesuai role. |
| MOB-02 | P0 | Home menampilkan live/upcoming match dan berita terbaru. | Hanya data dari turnamen/content published yang tampil; empty/loading/error state tersedia. |
| MOB-03 | P1 | Home menampilkan unread notification dan certificate CTA bila relevan. | Badge/CTA berasal dari API, bukan konstanta lokal. |
| MOB-04 | P0 | Aplikasi menyimpan dan memulihkan session dengan aman. | Token disimpan melalui SecureStore pada device; logout membersihkan storage dan cache privat. |
| MOB-05 | P0 | Demo mode tidak menyamar sebagai production. | Saat API URL kosong, UI/debug metadata mengidentifikasi penggunaan data demo; build production gagal bila URL wajib tidak ada. |

### 8.3 Kompetisi, tim, dan pertandingan

| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| COMP-01 | P0 | Age group dan stage berasal dari server. | Urutan mengikuti `sortOrder`; hanya item aktif/published terlihat. |
| COMP-02 | P0 | Stage menampilkan klasemen resmi dan fixture. | Posisi, played, W/D/L, GF/GA/GD, points berasal dari server. |
| TEAM-01 | P0 | Detail tim memuat identitas, pertandingan, pemain approved, dan statistik. | Pemain pending/rejected tidak tampil kepada fan; empty state tampil jika belum ada data. |
| TEAM-02 | P0 | Pengguna dapat menambah/menghapus favorit. | Update optimistis di-rollback saat API gagal; state tersinkron setelah login ulang. |
| MATCH-01 | P0 | Schedule dapat difilter minimal menjadi Today, Upcoming, Results. | Kategori didasarkan pada timezone dan status resmi; list dapat membuka detail. |
| MATCH-02 | P0 | Detail match menampilkan tim, waktu, venue, status, skor, event, dan highlight. | Match live dipoll maksimum setiap 30 detik; polling berhenti setelah final/non-live. |
| MATCH-03 | P1 | Link venue/map dapat dibuka secara aman. | Hanya URL valid yang dapat dibuka dan kegagalan memiliki fallback. |

### 8.4 Coach dan approval

| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| COACH-01 | P0 | Coach hanya melihat tim yang ditugaskan aktif. | API menolak akses tim lain dengan 403 walaupun ID dimanipulasi. |
| COACH-02 | P0 | Setup menunjukkan status coach name, jersey, pemain, dan progress. | Status menggunakan `NOT_STARTED`, `PENDING`, `APPROVED`, `REJECTED`; alasan rejection tampil. |
| COACH-03 | P0 | Coach dapat submit nama coach. | Minimal satu nama valid; submission pending tidak boleh ditimpa tanpa aturan revisi yang jelas. |
| COACH-04 | P0 | Coach dapat submit home/away jersey. | Kedua payload tervalidasi; data resmi berubah hanya saat approval. |
| COACH-05 | P0 | Coach dapat submit pemain baru/perubahan. | Nomor 1–99, unik per tim, dan kuota squad diperiksa di server. |
| COACH-06 | P0 | Admin dapat approve/reject dengan alasan. | Rejection wajib memiliki alasan; approval memperbarui canonical record secara transaksional dan menulis audit/outbox. |

### 8.5 Admin — tournament setup

| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| ADM-01 | P0 | Admin dapat membuat dan mengelola tournament lifecycle. | Status `DRAFT`, `PUBLISHED`, `ARCHIVED`; end tidak sebelum start; slug unik. |
| ADM-02 | P0 | Admin dapat mengelola age group dan squad limit. | Nama unik per tournament; limit dipakai saat approval pemain. |
| ADM-03 | P0 | Admin dapat mengelola stage/group. | Stage terkait age group, memiliki type/order/published; hanya published dapat dibaca publik. |
| ADM-04 | P0 | Admin dapat mengelola venue dan pitch. | Pitch selalu terkait venue; hanya venue/pitch aktif dapat digunakan pada fixture baru. |
| ADM-05 | P0 | Admin dapat mengelola team dan coach assignment. | Team terkait tournament dan age group yang konsisten; assignment coach unik dan dapat dinonaktifkan. |
| ADM-06 | P1 | List admin mendukung search, filter, pagination, dan sort. | Filter dijalankan server-side dan parameter dipertahankan pada navigasi. |

### 8.6 Jadwal, live score, dan klasemen

| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| OPS-01 | P0 | Admin dapat membuat fixture manual. | Home/away berbeda; semua referensi berada dalam tournament/age/stage yang konsisten. |
| OPS-02 | P0 | Sistem mendeteksi bentrok. | Team atau pitch yang sama tidak boleh memiliki window `duration + buffer` yang overlap. |
| OPS-03 | P1 | Sistem menghasilkan round-robin untuk stage. | Setiap pasangan bermain sesuai konfigurasi, jadwal deterministik, dan konflik dilaporkan sebelum commit. |
| OPS-04 | P0 | Operator dapat memulai live match. | Hanya transisi yang valid diterima; perubahan diaudit dan disebarkan via outbox. |
| OPS-05 | P0 | Finalisasi hasil bersifat atomik. | Skor, event, status, klasemen, statistik, audit, dan outbox berhasil bersama atau rollback bersama. |
| OPS-06 | P0 | Koreksi hasil final dibatasi. | Hanya Super Admin; membutuhkan konfirmasi eksplisit dan audit before/after. |
| OPS-07 | P0 | Klasemen sepak bola dihitung server-side. | Menang 3, seri 1, kalah 0; tie-break awal: points, goal difference, goals for; aturan tambahan harus diputuskan sebelum produksi. |
| OPS-08 | P1 | Ranking manual dapat dioverride. | Alasan wajib, nilai resmi dapat ditelusuri, dan recalculation tidak diam-diam menghapus override. |

### 8.7 Konten, notifikasi, sertifikat, dan laporan

| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| CNT-01 | P0 | News memiliki draft/published/archived workflow. | Hanya published dan non-deleted tampil di API publik. |
| CNT-02 | P1 | Highlight/media metadata dapat dikaitkan ke tournament/match/player. | Mime type, path/URL, urutan, dan publication status tervalidasi. |
| CNT-03 | P0 | Tournament rules memiliki versi dan status publikasi. | Mobile hanya menerima versi published; versi lama tetap dapat diaudit. |
| NTF-01 | P1 | Admin dapat membuat notifikasi individual/broadcast. | Record dan outbox dibuat; delivery status menjadi `QUEUED`, `DELIVERED`, atau `FAILED`. |
| NTF-02 | P1 | Pengguna dapat membaca dan menandai notifikasi. | Pengguna hanya dapat mengubah notifikasinya sendiri. |
| CERT-01 | P1 | Pengguna terautentikasi dapat menghasilkan sertifikat eligible. | Eligibility diverifikasi server, code unik, artefak dapat diunduh, dan endpoint check mengembalikan validitas. |
| RPT-01 | P1 | Admin dapat mengekspor laporan sesuai filter dan permission. | Ekspor konsisten dengan data layar, tidak membocorkan kolom sensitif, dan tercatat bila sensitif. |

### 8.8 Akun admin, RBAC, dan audit

| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| SEC-01 | P0 | Permission diverifikasi server-side pada setiap admin mutation. | Menyembunyikan menu saja tidak dianggap kontrol akses. |
| SEC-02 | P0 | Hanya Super Admin mengelola akun/role admin. | Operator menerima 403 pada akses langsung dan server action. |
| SEC-03 | P0 | Tindakan sensitif memiliki confirmation gate. | Finalisasi/koreksi, approval, role change, dan override memerlukan konfirmasi eksplisit. |
| AUD-01 | P0 | Audit menyimpan actor, action, entity, before/after, reason, timestamp. | Log immutable dari UI dan dapat difilter oleh pengguna berpermission. |
| AUD-02 | P0 | Data rahasia tidak masuk audit. | Password, raw token, cookie, dan secret tidak pernah direkam. |

## 9. Aturan bisnis dan lifecycle

### 9.1 Status utama

| Entitas | Lifecycle |
|---|---|
| Tournament | `DRAFT → PUBLISHED → ARCHIVED` |
| Submission | `NOT_STARTED → PENDING → APPROVED/REJECTED`; revisi membuat submission baru |
| Match | `SCHEDULED → LIVE → FINISHED`; dapat menjadi `POSTPONED` atau `CANCELLED` melalui transisi terkontrol |
| Content | `DRAFT → PUBLISHED → ARCHIVED` |
| Player | `ACTIVE`, `INACTIVE`, `TRANSFERRED`; visibility publik juga mensyaratkan approval `APPROVED` |
| Delivery | `QUEUED → DELIVERED/FAILED` |

### 9.2 Invariant wajib

- Semua referensi tournament–age group–stage–team–match harus konsisten.
- Home dan away team harus berbeda.
- Nomor jersey unik dalam satu team.
- Pemain approved tidak boleh melebihi `maxSquadSize`.
- Hanya pertandingan `SCHEDULED`, `LIVE`, atau `FINISHED` yang tampil publik.
- Hanya tournament/stage/content published yang tampil publik.
- Koreksi hasil final tidak boleh kehilangan nilai sebelum koreksi.
- Tanggal/waktu disimpan dalam UTC dan ditampilkan menurut timezone event/perangkat.

## 10. Non-functional requirements

### 10.1 Security

- Password di-hash dengan bcrypt cost memadai (implementasi saat ini cost 12).
- `SESSION_SECRET` production wajib kuat dan tidak boleh fallback ke default.
- Raw admin/mobile/reset token tidak disimpan; hanya hash token pada database.
- Validasi input server-side wajib untuk seluruh endpoint/action.
- CORS, CSP, security headers, CSRF posture, rate limiting terdistribusi, dan secret rotation harus dikonfigurasi sebelum production.
- Authorization harus diuji terhadap IDOR pada team, notification, dan coach endpoints.

### 10.2 Performance dan scalability

- List API memakai pagination server-side, maksimum 100 item per page.
- Index mencakup foreign key/filter/sort yang sering dipakai.
- Pool koneksi database memiliki batas yang sesuai deployment.
- Polling live default 20–30 detik dengan backoff saat error/background.
- Media dilayani dari object storage/CDN, bukan filesystem ephemeral production.

### 10.3 Reliability

- Mutation multi-entitas menggunakan transaksi.
- Efek eksternal menggunakan transactional outbox dan idempotent worker.
- Backup PostgreSQL, restore drill, migration rollback/forward plan, dan alert job gagal wajib tersedia.
- API menggunakan structured error code dan correlation/request ID.

### 10.4 Accessibility dan UX

- Touch target minimal 44×44, label screen reader, contrast WCAG AA, dan dynamic type yang layak.
- Semua loading, empty, error, disabled, pending, rejected, dan offline state memiliki representasi.
- Aksi destruktif/sensitif tidak hanya dibedakan melalui warna.

### 10.5 Compatibility

- Mobile: Android dan iOS melalui Expo; web build mobile bersifat pendukung, bukan target utama tanpa keputusan produk.
- Admin: dua versi terbaru browser Chromium, Firefox, dan Safari desktop.
- Layout admin usable pada viewport tablet; operasi kompleks diprioritaskan untuk desktop.

## 11. Analytics dan event minimum

Event berikut harus memakai nama konsisten dan tidak memuat PII mentah:

- `auth_login_succeeded`, `auth_login_failed`, `auth_session_refreshed`;
- `home_viewed`, `match_opened`, `team_opened`, `favorite_toggled`;
- `coach_submission_created`, `coach_submission_reviewed`, `coach_submission_rejected`;
- `match_started`, `match_finalized`, `match_score_corrected`;
- `content_published`, `notification_queued`, `certificate_generated`;
- `api_error`, `job_failed`, `schedule_conflict_detected`.

Dashboard operasional harus memantau jumlah tim/pemain approved, pertandingan scheduled/live, submission pending, outbox lag, failure rate, dan waktu approval.

## 12. Kondisi implementasi saat ini

| Area | Status saat ini | Gap menuju rilis terintegrasi |
|---|---|---|
| Mobile navigation/UI | Tersedia dan mengikuti mockup utama | Lengkapi accessibility, error/offline state, deep link, dan contract mapping |
| Mobile server state | TanStack Query dipakai pada layar utama | Sebagian data masih mengambil mock/fallback; auth token belum diteruskan repository |
| Mobile auth | Demo session tersimpan | Hubungkan login/refresh/logout production dan secure token lifecycle |
| Admin portal | Modul operasi utama tersedia | Lengkapi filter/pagination/export/edit/archive dan hardening UX |
| API v1 | Public, mobile auth, coach, favorites, notifications, certificate tersedia | Selaraskan response DTO dengan mobile; tambah schema/contract test dan logout revocation |
| Database | Schema luas, migrasi dan seed tersedia | Audit index/constraint, production migration rehearsal, timezone/tenant decisions |
| Match engine | Conflict check, round-robin, finalization, standings tersedia | Tambah comprehensive rules, concurrency test, correction/override semantics |
| Integrations | Local outbox/adapter tersedia | Pilih email/push/object storage/PDF provider production |
| Testing | Unit test domain dan beberapa mobile tests tersedia | Tambah API integration, DB transaction, component, E2E, security, load tests |

## 13. Release plan

### Phase 0 — Contract freeze dan foundation

- Tetapkan DTO API canonical, timezone, tournament selection, dan football tie-break.
- Pisahkan TypeScript scope mobile dan web; semua typecheck/lint/test hijau.
- Siapkan environment schema, CI, database ephemeral test, dan secret policy.

### Phase 1 — Integrated read experience

- Hubungkan login mobile, home, competition, match, team, news, rules, dan favorite ke API.
- Hapus hardcoded ID pada alur production.
- Tambahkan contract/integration tests.

### Phase 2 — Coach workflow

- Hubungkan team assignment, setup projection, submission, rejection reason, revision, dan cache invalidation.
- Validasi squad limit dan jersey uniqueness pada transaksi database.

### Phase 3 — Tournament operations

- Hardening tournament setup, schedule conflict, round-robin, live score, finalization, correction, standings, dan audit.
- Tambahkan concurrency serta idempotency test.

### Phase 4 — Content dan integrations

- Production media storage, notification delivery, password-reset mail, certificate generation/check, reports/export.

### Phase 5 — Production readiness

- Security review, load test, accessibility audit, backup/restore drill, observability dashboard, runbook, staged rollout.

## 14. Definition of Done

Rilis terintegrasi dianggap selesai jika:

- seluruh requirement P0 memenuhi acceptance criteria;
- mobile production tidak memakai data demo dan seluruh DTO selaras dengan API;
- typecheck, lint, unit, integration, contract, dan E2E smoke test lulus di CI;
- database migration berhasil diuji dari kosong dan dari versi production terakhir;
- RBAC, IDOR, token lifecycle, rate limit, dan secret configuration lolos security review;
- transaksi skor/approval terbukti atomik dan audit/outbox lengkap;
- dashboard/log/alert, backup, restore, dan rollback runbook tersedia;
- keputusan terbuka P0 telah ditutup dan disetujui product/engineering.

## 15. Keputusan produk yang masih diperlukan

1. Apakah pengguna umum wajib login untuk membaca data publik, atau hanya untuk favorite/notifikasi/certificate?
2. Tournament aktif dipilih otomatis, lewat slug, atau melalui selector pengguna?
3. Timezone canonical event dan aturan “Today” lintas zona waktu.
4. Tie-break setelah points, goal difference, dan goals for.
5. Apakah pertandingan `FINISHED` dapat dikembalikan ke `LIVE`, atau hanya dikoreksi sebagai final?
6. Aturan revisi submission pending dan jumlah maksimum revisi.
7. Eligibility serta template sertifikat.
8. Provider production untuk email, push, object storage/CDN, dan analytics.
9. Apakah multi-sport masuk roadmap aktif atau hanya kesiapan schema.
10. Retention policy untuk audit, notification, token, media, dan data personal.

