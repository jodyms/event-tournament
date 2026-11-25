# Kickzone Tournament Mobile

Mobile frontend React Native/Expo untuk pengalaman fan dan coach pada turnamen sepak bola. Jika `EXPO_PUBLIC_API_URL` terisi, aplikasi memakai API. Data demo hanya untuk pengembangan dan tes. Build production menolak menyala bila URL itu kosong.

## Jalankan

Dari root monorepo (atau langsung dari `apps/mobile`):

```powershell
npm run dev:mobile
# atau dari apps/mobile:
npm start
npm run android
```

Mode demo menerima email valid dan password minimal 8 karakter. Login ke server memakai akun yang ada di basis data.

## Pemeriksaan

```powershell
npm run typecheck
npm run lint
npm test
npx expo-doctor
```

## Struktur (`apps/mobile/src/`)

- `features/` — layar dan alur per domain (`auth`, `coach`, `competition`, `content`, `favorites`, `home`, `matches`, `navigation`, `news`, `teams`).
- `components/` — komponen UI reusable (`layout`, `controls`, `cards`, `sheet`) diekspor melalui `index.ts`.
- `design-system/` — token dark theme yang diturunkan dari mockup.
- `data/mockData.ts` — data demo untuk pengembangan dan tes.
- `domain/models.ts` — tipe data domain klien.
- `navigation/` — kontrak route dan navigator stack/tab.
- `services/api/client.ts` — satu-satunya batas `fetch` ke REST `/api/v1`.
- `services/storage/session.ts` — penyimpanan token sesi lokal.
- `store/appStore.ts` — state aplikasi & sesi (Zustand).

`EXPO_PUBLIC_API_URL` adalah origin server, tanpa akhiran `/api/v1`. Klien yang menambahkan jalur itu. Jangan menyimpan token atau secret backend dalam bundle aplikasi.
