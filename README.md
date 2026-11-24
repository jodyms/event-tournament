# Kickzone Tournament Mobile

Mobile frontend React Native/Expo untuk pengalaman fan dan coach pada turnamen sepak bola. Aplikasi menggunakan data demo lokal sampai kontrak API tersedia.

## Jalankan

```powershell
npm install
npm start
```

Gunakan `npm run android` untuk membuka di Android/Expo Go. Akun demo menerima email valid dan password minimal 6 karakter.

## Pemeriksaan

```powershell
npm run typecheck
npm run lint
npm test
npx expo-doctor
```

## Struktur

- `src/features` — layar dan alur per domain.
- `src/components` — komponen UI reusable dan bottom sheet.
- `src/design-system` — token dark theme yang diturunkan dari mockup.
- `src/data/mockData.ts` — data demo untuk alur yang dapat dicoba.
- `src/services/api/client.ts` — batas integrasi REST `/api/v1` saat backend tersedia.

Variabel `EXPO_PUBLIC_API_URL` disiapkan untuk koneksi API. Jangan menyimpan token atau secret backend dalam bundle aplikasi.
