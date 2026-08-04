# Rancang — Generator Maket 3D

Platform web maket 3D berbasis lokasi peta (terinspirasi CadMapper) dengan alur dua peran:
**Klien** menandai titik lokasi → **Perencana** menyusun poligon batas (manual dan/atau dibantu
**Claude API**) → pipeline membangun **maket 3D GLB** (bangunan, jalan 3 hierarki, air, terrain)
dari data **OSM Overpass** + **Google Elevation**, dipreview dengan React Three Fiber.

## Prasyarat

- Node.js ≥ 24, npm
- [OrbStack](https://orbstack.dev) (runtime Docker) — `brew install --cask orbstack`
- API key: Google Maps (client + server) dan Anthropic — lihat `.env.example`

## Mulai cepat

```bash
open -a OrbStack                # pastikan Running
docker compose up -d            # PostgreSQL 16 @ localhost:5433 (5432 dibiarkan kosong)
cp .env.example .env            # isi AUTH_SECRET + semua API key
npm install
npx prisma migrate dev
npx prisma db seed              # akun demo klien@demo.id / perencana@demo.id (password123)
npm run smoke                   # cek 4 API eksternal — pastikan hijau semua
npm run dev                     # http://localhost:3000
```

## Skrip penting

| Perintah | Fungsi |
|---|---|
| `npm run smoke` | Uji kredensial Overpass / Elevation / Geocoding / Anthropic / Maps |
| `npm run fixture` | Tulis GLB fixture statis (uji kontrak viewer tanpa API eksternal) |
| `npm run pipeline <projectId>` | Jalankan pipeline 3D dari CLI (tanpa web UI) |
| `npm run pipeline <projectId> -- --fixture` | Daftarkan fixture sebagai model proyek |

## Arsitektur singkat

- **Auth**: Auth.js v5 credentials, JWT session ber-`role` (KLIEN/PERENCANA); `auth.config.ts`
  edge-safe untuk middleware, `auth.ts` penuh untuk Node.
- **Job async tanpa Redis**: `lib/jobs/runner.ts` (fire-and-forget + `globalThis`), status di tabel
  `ProcessingJob`, dipoll SWR; `instrumentation.ts` menandai job zombie saat server restart.
- **Pipeline 3D** (`lib/pipeline/`): fetch-osm → merge-heights → fetch-elevation (degradasi flat)
  → project-clip (turf v7) → build-geometry (earcut, winding-normalized) → export-glb
  (@gltf-transform, node `layer:*`, sumbu glTF Y-up `(x,y,z)→(x,z,-y)`).
- **LLM** (`lib/llm/`): tool `propose_boundary` (strict), `tool_choice` paksa, loop validasi
  `tool_result is_error` maks 3×, konteks jalan/sungai dari Overpass `around:1000`, riwayat utuh
  di `LlmSession`.
- **Viewer**: R3F + drei `useGLTF` (dibungkus `Suspense`), toggle layer via nama node `layer:*`,
  klik bangunan → info tinggi via vertex attribute `_FEATUREID`.
- **Editor poligon**: `google.maps.Polygon editable:true` + mode gambar klik-per-vertex
  (Drawing Library Google sudah deprecated, dihapus Mei 2026).

Atribusi wajib: “© OpenStreetMap contributors” (ODbL) di viewer, atribusi Google di peta.

## Design system

Tema UI dihasilkan skill `ui-ux-pro-max` dan tersimpan di
`design-system/rancang-maket-3d/MASTER.md` — Glassmorphism + Enterprise SaaS, primer
Indigo→Violet, tipografi Poppins/Open Sans. Token semantik ada di `app/globals.css`
(`--color-primary`, `--color-accent`, `.glass`, `.aurora`, `.btn-primary`); jangan menulis
hex mentah di komponen. Ikon memakai Lucide (SVG), bukan emoji.

## Batasan prototype

- Luas boundary maks 4 km² (validasi server); usulan LLM 0.05–4 km², 6–30 vertex.
- Job berjalan di proses Next (bukan serverless) — deploy target `next start` di VPS.
- Google Open Buildings, ekspor DXF/OBJ, admin = tahap M5 (belum diimplementasi).
