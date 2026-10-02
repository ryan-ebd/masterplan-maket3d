/**
 * Smoke test API eksternal — jalankan: npm run smoke
 * Memastikan kredensial hidup SEBELUM fitur dibangun/di-debug di atasnya.
 */
import fs from "node:fs";

if (fs.existsSync(".env")) process.loadEnvFile(".env");

type Hasil = { nama: string; ok: boolean; detail: string };
const hasil: Hasil[] = [];

async function cekOverpass() {
  const q = "[out:json][timeout:10];node[amenity](around:100,-6.9175,107.6098);out count;";
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
  let terakhir = "";
  for (const url of endpoints) {
    for (let percobaan = 0; percobaan < 2; percobaan++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "masterplan-maket3d/0.1 (prototype; kontak: ryan@ebede.id)",
          },
          body: "data=" + encodeURIComponent(q),
          signal: AbortSignal.timeout(20_000),
        });
        terakhir = `HTTP ${res.status} dari ${new URL(url).host}`;
        if (res.ok) {
          const body = (await res.json()) as { elements?: unknown[] };
          if (Array.isArray(body.elements)) {
            hasil.push({ nama: "Overpass API", ok: true, detail: terakhir });
            return;
          }
        }
      } catch (e) {
        terakhir = (e as Error).message;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  hasil.push({ nama: "Overpass API", ok: false, detail: `semua endpoint gagal (${terakhir})` });
}

/** Terjemahkan status+error_message Google jadi petunjuk yang bisa ditindaklanjuti. */
function jelaskanGagalGoogle(status?: string, pesan?: string) {
  const dasar = `status: ${status}${pesan ? ` — ${pesan}` : ""}`;
  if (pesan?.includes("referer restrictions")) {
    return `${dasar}\n     -> Key ini dibatasi HTTP referrer. Elevation/Geocoding dipanggil server-ke-server (tanpa referrer)\n        sehingga SELALU ditolak. Buat key BARU di Cloud Console: Application restrictions = None (atau IP),\n        API restrictions = Geocoding API + Elevation API, lalu isikan ke GOOGLE_MAPS_SERVER_KEY.`;
  }
  if (status === "REQUEST_DENIED") return `${dasar}\n     -> Cek: API sudah di-enable? Billing aktif? Key benar?`;
  if (status === "OVER_QUERY_LIMIT") return `${dasar}\n     -> Kuota/billing habis pada project Cloud ini.`;
  return dasar;
}

async function cekElevation() {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) {
    hasil.push({ nama: "Google Elevation", ok: false, detail: "GOOGLE_MAPS_SERVER_KEY kosong di .env" });
    return;
  }
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/elevation/json?locations=-6.9175,107.6098&key=${key}`,
    { signal: AbortSignal.timeout(15_000) },
  );
  const body = (await res.json()) as { status?: string; error_message?: string; results?: { elevation: number }[] };
  hasil.push({
    nama: "Google Elevation",
    ok: body.status === "OK",
    detail:
      body.status === "OK"
        ? `elevasi Bandung ≈ ${body.results?.[0]?.elevation.toFixed(0)} m`
        : jelaskanGagalGoogle(body.status, body.error_message),
  });
}

async function cekGeocoding() {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) {
    hasil.push({ nama: "Google Geocoding", ok: false, detail: "GOOGLE_MAPS_SERVER_KEY kosong di .env" });
    return;
  }
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=-6.9175,107.6098&key=${key}&language=id`,
    { signal: AbortSignal.timeout(15_000) },
  );
  const body = (await res.json()) as { status?: string; error_message?: string; results?: { formatted_address: string }[] };
  hasil.push({
    nama: "Google Geocoding",
    ok: body.status === "OK",
    detail:
      body.status === "OK"
        ? body.results?.[0]?.formatted_address ?? ""
        : jelaskanGagalGoogle(body.status, body.error_message),
  });
}

async function cekAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    hasil.push({ nama: "Anthropic API", ok: false, detail: "ANTHROPIC_API_KEY kosong di .env" });
    return;
  }
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: key });
  const model = process.env.LLM_MODEL ?? "claude-sonnet-5";
  const msg = await client.messages.create({
    model,
    max_tokens: 16,
    messages: [{ role: "user", content: "Balas satu kata: OK" }],
  });
  const teks = msg.content.find((b) => b.type === "text");
  hasil.push({ nama: `Anthropic (${model})`, ok: !!teks, detail: teks?.type === "text" ? teks.text.trim() : "?" });
}

async function cekSeedance() {
  const key = process.env.ARK_API_KEY;
  if (!key) {
    hasil.push({ nama: "BytePlus Seedance", ok: false, detail: "ARK_API_KEY kosong di .env" });
    return;
  }
  const base = (process.env.ARK_BASE_URL || "https://ark.ap-southeast.bytepluses.com/api/v3").replace(/\/+$/, "");
  // List task: tidak membuat video -> tidak memakai kredit; cukup membuktikan key + region.
  const res = await fetch(`${base}/contents/generations/tasks?page_size=1`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (res.ok) {
    const model = process.env.SEEDANCE_MODEL || "dreamina-seedance-2-0-260128";
    hasil.push({ nama: "BytePlus Seedance", ok: true, detail: `key valid, model: ${model}` });
    return;
  }
  const teks = (await res.text()).slice(0, 200);
  const petunjuk =
    res.status === 401 || res.status === 403
      ? "\n     -> Key ditolak. Cek ARK_API_KEY (key ModelArk, bukan key akun lain) dan region ARK_BASE_URL."
      : "";
  hasil.push({ nama: "BytePlus Seedance", ok: false, detail: `HTTP ${res.status} — ${teks}${petunjuk}` });
}

function cekMapsClientKey() {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  hasil.push({
    nama: "Maps JS key (client)",
    ok: !!key,
    detail: key ? "terisi (validasi penuh terjadi saat peta dirender di browser)" : "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY kosong di .env",
  });
}

const jalan = async (fn: () => Promise<void> | void, nama: string) => {
  try {
    await fn();
  } catch (e) {
    hasil.push({ nama, ok: false, detail: (e as Error).message });
  }
};

async function main() {
  await Promise.all([
    jalan(cekOverpass, "Overpass API"),
    jalan(cekElevation, "Google Elevation"),
    jalan(cekGeocoding, "Google Geocoding"),
    jalan(cekAnthropic, "Anthropic API"),
    jalan(cekSeedance, "BytePlus Seedance"),
    jalan(() => cekMapsClientKey(), "Maps JS key"),
  ]);

  console.log("\n=== SMOKE TEST ===");
  let gagal = 0;
  for (const h of hasil.sort((a, b) => a.nama.localeCompare(b.nama))) {
    console.log(`${h.ok ? "✅" : "❌"} ${h.nama}: ${h.detail}`);
    if (!h.ok) gagal++;
  }
  console.log(
    gagal === 0 ? "\nSemua hijau ✨" : `\n${gagal} pemeriksaan gagal — isi/perbaiki .env lalu jalankan ulang.`,
  );
  process.exit(gagal === 0 ? 0 : 1);
}

main();
