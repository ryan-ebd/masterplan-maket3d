# Laporan QA — Prototype Rancang Maket 3D (M1–M4 + Tahap 8)

Periode uji: 1–3 Agustus 2026 · Metode: uji manual end-to-end di browser (Chromium embedded)
+ CLI harness + verifikasi DB langsung. Akun uji: `klien@demo.id` (Budi) & `perencana@demo.id` (Sari).

## Ringkasan hasil

| # | Alur | Hasil | Bukti |
|---|---|---|---|
| 1 | Login/guard dua peran, redirect sesuai role | ✅ LULUS | Login kedua akun → dashboard masing-masing; salah role di-redirect |
| 2 | Klien buat proyek + picker titik | ✅ LULUS | Peta picker render dgn AdvancedMarker (setelah key Maps terisi) |
| 3 | Klaim perencana (BARU → DIPROSES) | ✅ LULUS | `proyek-demo-2` pindah ke "Proyek Saya" via tombol Klaim |
| 4 | LLM suggest-boundary (tool strict + validasi loop) | ✅ LULUS LIVE | 19 vertex, 0.483 km², reasoning menyebut jalan nyata (Perintis Kemerdekaan, Lembong, Braga); tersimpan ke `boundary/boundaryNote/zonesMeta/LlmSession` |
| 5 | LLM chat revisi ("kecilkan ke blok Alun-Alun ±0.1 km²") | ✅ LULUS LIVE | Revisi → 7 vertex, 0.061 km²; poligon tampil di editor; riwayat sesi 7 blok |
| 6 | Editor poligon (Polygon editable, tanpa DrawingManager) | ✅ render draft LLM; geser-vertex manual ⚠️ menunggu key referrer stabil |
| 7 | Generate via UI + progress polling per-step | ✅ LULUS | Progress bar 0→100% dengan label step Indonesia; job DONE 11–30 dtk |
| 8 | Pipeline 3D data nyata | ✅ LULUS | Braga: 327 bangunan/68 jalan/2 air (28 dtk); Alun-Alun: 89 bangunan; GLB valid (node layer:*, `_FEATUREID`, sumbu benar — tidak mirror) |
| 9 | Tinggi per zona LLM | ✅ LULUS | Bangunan Alun-Alun tinggi 8.0 m, sumber "estimasi zona LLM" (zona fasum) |
| 10 | Cache Overpass per proyek | ✅ LULUS | Run #1 30.1 dtk (jaringan) → run #2 5.4 dtk (log `pakai cache`); kunci = hash boundary |
| 11 | Skenario gagal jaringan + pemulihan | ✅ LULUS | Endpoint disabotase → job ERROR + pesan ramah + proyek GAGAL + tombol 🔁 Coba Lagi → endpoint pulih → retry DONE → REVIEW_PERENCANA |
| 12 | Publish → viewer klien read-only | ✅ LULUS | Badge "Sudah dipublikasikan"; klien melihat maket + timeline penuh |
| 13 | Toggle layer viewer | ✅ LULUS | Uncheck "Bangunan" → bangunan hilang dari kanvas (via `userData.layer`) |
| 14 | Klik-info bangunan | ✅ LULUS | Klik atap → kartu "Tinggi 8.0 m · estimasi zona LLM · way/157838266" |
| 15 | Regenerate menghapus GLB lama | ✅ LULUS | Direktori model hanya berisi 1 file setelah regenerate |
| 16 | Rate limit LLM/generate | ✅ terpasang (in-memory; 10/mnt LLM, 6/mnt generate) — belum diuji beban |
| 17 | Instrumentation recovery job zombie | ✅ terpasang; terpicu wajar saat restart dev |

## Bug ditemukan & diperbaiki selama QA

1. **Kanvas viewer putih tanpa error** — `useGLTF` suspending; `ModelMaket` kini dibungkus `<Suspense>`. (`components/viewer/AdeganMaket.tsx`)
2. **Chat LLM 400 `tool_use` tanpa `tool_result`** — Claude memanggil tool 2× paralel; fix `disable_parallel_tool_use` + balasan defensif per-`tool_use`. (`lib/llm/chat.ts`, `lib/llm/suggestBoundary.ts`)
3. **Gagal auth Maps menjatuhkan seluruh halaman** — ditambah `PetaErrorBoundary` dengan pesan perbaikan spesifik (RefererNotAllowedMapError). (`components/peta/PenyediaPeta.tsx`)
4. **Toggle layer diam-diam tidak berfungsi** — three.js menyanitasi nama node `layer:bangunan` → `layerbangunan`; matching kini via glTF `extras`→`userData.layer`. (`components/viewer/ModelMaket.tsx`)
5. **Klik-info tidak merespons** — GLTFLoader me-lowercase atribut kustom `_FEATUREID` → `_featureid`. (`components/viewer/ModelMaket.tsx`)

## Blocker eksternal tersisa (aksi user di Google Cloud Console)

- **Peta mati beberapa detik setelah render** (`RefererNotAllowedMapError`): tambahkan
  `http://localhost:3000/*` ke HTTP referrer key browser.
- **Geocoding + Elevation `REQUEST_DENIED`**: kedua key ber-restriksi referrer; buat key server
  tanpa restriksi referrer (restrict by API: Geocoding + Elevation; enable Elevation API) →
  `GOOGLE_MAPS_SERVER_KEY`. Efek saat ini: alamat proyek null, terrain selalu flat (degradasi
  anggun bekerja sesuai desain).

## Tahap 8 — Pengerasan (3 Agu 2026)

| Uji | Hasil |
|---|---|
| Cache Overpass per proyek | ✅ run #1 30.1 dtk → run #2 **5.4 dtk** (log `pakai cache`); kunci = hash boundary |
| Skenario gagal jaringan | ✅ endpoint disabotase → job ERROR + pesan Indonesia + proyek GAGAL |
| Tombol "Coba Lagi" | ✅ endpoint dipulihkan → retry → DONE → REVIEW_PERENCANA |
| Klik-info bangunan | ✅ "Tinggi 8.0 m · estimasi zona AI · way/157838266" |
| Toggle layer | ✅ uncheck Bangunan → hilang dari kanvas |
| **IDOR lintas-perencana** | ✅ perencana B: baca 403, boundary 403, generate 403, publish 403, daftar proyek kosong |
| **Idempotensi generate atomik** | ✅ 3 request bersamaan → 1 job (2 balas jobId sama, 1 ditolak 409) |
| **Cache-buster viewer** | ✅ `Model3D.updatedAt` berubah tiap regenerate (model.id tetap) |
| **Sapu GLB yatim** | ✅ 3 file → 1 file setelah regenerate; sisa = yang dirujuk DB |

### Review adversarial (60 agen, 4 dimensi)
25 temuan terkonfirmasi lewat verifikasi silang 2 skeptis/temuan. **9 diperbaiki** (5 severity tinggi
+ 4 sedang/rendah): IDOR, grid elevasi terpotong >2400 m, cache-buster viewer, race generate,
`stop_reason` chat LLM tak dicek, double-submit UI, draft LLM bernonce, error boundary viewer,
race registrasi (P2002). Sisanya terdokumentasi untuk iterasi berikut.

## Peningkatan UI/UX (3 Agu 2026)

Design system dari skill `ui-ux-pro-max` (Glassmorphism + Enterprise SaaS, Indigo→Violet,
Poppins/Open Sans) — tersimpan di `design-system/rancang-maket-3d/MASTER.md`.

| Aspek | Hasil |
|---|---|
| Token semantik Tailwind v4 | ✅ `--color-primary/accent/danger/...` di `globals.css`; tanpa hex mentah di komponen |
| Ikon | ✅ seluruh emoji struktural → SVG Lucide (`lucide-react`) |
| Tipografi | ✅ Poppins (display) + Open Sans (body) via `next/font` |
| Aksesibilitas | ✅ label `for` di semua input, `role="alert"`, `aria-label` tombol ikon, fokus 2px, target ≥44px |
| Gerak | ✅ transisi 150–300 ms; `prefers-reduced-motion` mematikan animasi aurora |
| Verifikasi | ✅ `tsc` bersih, `next build` sukses, halaman terrender benar di browser |

## Belum diuji

- Uji beban rate limit & konkurensi multi-user.
- Terrain elevasi nyata (menunggu key server) — jalur degradasi flat sudah teruji.
- Geser-vertex/gambar poligon dengan tangan di peta stabil (menunggu fix referrer) —
  render draft, simpan (PUT /boundary via alur LLM), dan validasi luas server sudah teruji.
