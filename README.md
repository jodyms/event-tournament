# Kickzone / TYC Monorepo

Platform turnamen sepak bola berbasis monorepo npm workspaces: aplikasi mobile Expo (`apps/mobile`) untuk fan & coach, dan aplikasi Next.js (`apps/web`) yang berfungsi sebagai Admin Web sekaligus backend REST `/api/v1`.

## Struktur Proyek

```text
/
├─ apps/
│  ├─ mobile/          # Expo React Native (Fan & Coach app)
│  └─ web/             # Next.js 16 Admin Web & /api/v1 REST API + Drizzle ORM
├─ docs/               # PRD, technical spec, arsip perencanaan, dan desain
│  ├─ archive/         # Dokumen perencanaan awal (01_–07_) & tracker CSV
│  └─ design/          # Referensi Figma PDF & mockup gambar
├─ package.json        # Root npm workspaces & skrip monorepo
└─ run.bat             # Skrip quick-start Windows untuk Admin Web + Mobile
```

## Menjalankan

```powershell
npm install
npm run dev:web        # Jalankan Admin Web & API di http://localhost:3000
npm run dev:mobile     # Jalankan Expo dev server
```

Atau di Windows, jalankan `run.bat` (pastikan `apps/web/.env` sudah terisi `DATABASE_URL` dan `SESSION_SECRET`).

## Pemeriksaan Monorepo

```powershell
npm run typecheck      # Typecheck @kickzone/mobile & @kickzone/web
npm run lint           # Lint seluruh workspace
npm test               # Jalankan Jest (mobile) & Vitest (web)
```

Untuk perintah database (`apps/web`):

```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:seed:demo
npm run jobs:work
```

`db:seed` membuat peran, izin, dan admin. `db:seed:demo` mengisi data turnamen yang lebih besar untuk pengujian dan boleh dijalankan ulang: Piala TYC Jakarta 2026 (berlangsung), Piala TYC Bandung 2025 (arsip), Piala TYC Surabaya 2027 (draf), dan Festival Mini Soccer Depok 2026 (batal). Akun demo memakai `SEED_DEMO_PASSWORD`, atau `SEED_ADMIN_PASSWORD`, atau `ChangeMe123!`: `operator@tyc.local`, `coach@tyc.local`, dan `fan@tyc.local`.
