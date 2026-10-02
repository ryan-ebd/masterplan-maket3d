/**
 * Cek logika murni tahap tur/video TANPA browser, DB, atau API sungguhan — jalankan: npm run cek:tur
 * Mencakup: saran titik, peringatan loncatan, hash klip, validasi PNG, estimasi biaya, dan
 * bentuk body request Seedance (fetch di-mock; tidak ada kredit terpakai).
 */
import { deflateSync } from "node:zlib";
import { hashKlip } from "@/lib/tur/hash";
import { periksaLoncatan, poseGambaranUmum, poseSisiLuar, sarankanTitik, type RingkasBangunan } from "@/lib/tur/saran";
import { validasiFramePng } from "@/lib/tur/storage";
import { perkiraanBiayaKlip } from "@/lib/video/config";
import { buatPromptKlip } from "@/lib/video/prompt";
import { buatTask } from "@/lib/video/seedance";
import { PALET_VERSI } from "@/lib/render/paletMaket";
import type { Pose } from "@/lib/tur/types";

let gagal = 0;
function cek(nama: string, kondisi: boolean, detail = "") {
  console.log(`${kondisi ? "✅" : "❌"} ${nama}${detail ? ` — ${detail}` : ""}`);
  if (!kondisi) gagal++;
}

// --- 1. Saran titik pada kawasan sintetis 400 m ---------------------------------------
const L = 400;
const zona = ["perumahan", "komersial", "industri", "fasum", "campuran"];
const bangunan: RingkasBangunan[] = [];
const fitur: Record<string, { heightM: number; zoneType: string }> = {};
for (let i = 0; i < 40; i++) {
  const x = -180 + (i % 8) * 50;
  const z = -150 + Math.floor(i / 8) * 70;
  const tinggi = 6 + ((i * 7) % 23);
  const lebar = 12 + ((i * 5) % 20);
  bangunan.push({ featureId: i, x, z, lebar, luas: lebar * lebar, yDasar: 0, yAtas: tinggi });
  fitur[String(i)] = { heightM: tinggi, zoneType: zona[i % zona.length] };
}
const tertinggi = [...bangunan].sort((a, b) => b.yAtas - a.yAtas)[0];
const saran = sarankanTitik(bangunan, fitur, L, 5);
cek("saran: 1..5 titik", saran.length >= 1 && saran.length <= 5, `${saran.length} titik`);
cek("saran: bangunan tertinggi ikut", saran.some((s) => s.featureId === tertinggi.featureId));
cek("saran: tanpa duplikat", new Set(saran.map((s) => s.featureId)).size === saran.length);
const dasarB = new Map(bangunan.map((b) => [b.featureId, b]));
let jarakMinOk = true;
for (let i = 0; i < saran.length; i++) {
  for (let j = i + 1; j < saran.length; j++) {
    const a = dasarB.get(saran[i].featureId)!;
    const b = dasarB.get(saran[j].featureId)!;
    if (Math.hypot(a.x - b.x, a.z - b.z) < 0.12 * L) jarakMinOk = false;
  }
}
cek("saran: saling berjarak ≥ 0,12 L", jarakMinOk);
// urutan = nearest-neighbor dari kamera gambaran umum
let urutanNN = true;
{
  const sisa = saran.map((s) => s.pose.pos);
  let posisi = poseGambaranUmum(L).pos;
  const d = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[2] - q[2]);
  for (const s of saran) {
    const terdekat = Math.min(...sisa.map((p) => d(p, posisi)));
    if (Math.abs(d(s.pose.pos, posisi) - terdekat) > 1e-6) urutanNN = false;
    sisa.splice(sisa.findIndex((p) => p === s.pose.pos), 1);
    posisi = s.pose.pos;
  }
}
cek("saran: berurutan nearest-neighbor", urutanNN);
let poseOk = true;
for (const s of saran) {
  const b = dasarB.get(s.featureId)!;
  if (!(s.pose.pos[1] > b.yAtas)) poseOk = false; // kamera di atas atap
  if (Math.hypot(s.pose.target[0] - b.x, s.pose.target[2] - b.z) > 1e-6) poseOk = false; // menatap bangunan
  const luar = b.x * (s.pose.pos[0] - b.x) + b.z * (s.pose.pos[2] - b.z);
  if (Math.hypot(b.x, b.z) > 20 && !(luar > 0)) poseOk = false; // di sisi luar papan
}
cek("pose bangunan: di atas atap, menatap bangunan, sisi luar", poseOk);
cek("saran: kawasan kosong -> []", sarankanTitik([], {}, L).length === 0);

// --- 2. Peringatan loncatan -----------------------------------------------------------
const a: Pose = poseGambaranUmum(L);
const dekat = poseSisiLuar(bangunan[20]);
const sebelah: Pose = { pos: [a.pos[0] + 30, a.pos[1], a.pos[2] - 20], target: a.target };
cek("loncatan: pose berdekatan aman", periksaLoncatan(a, sebelah, L) === null);
const berlawanan: Pose = { pos: [0, 120, -300], target: [0, 0, 0] }; // memandang dari utara
cek("loncatan: berputar ~180° dan berpindah jauh -> peringatan", periksaLoncatan(a, berlawanan, L) !== null);
void dekat;

// --- 3. Hash klip ---------------------------------------------------------------------
const ujung = (p: Pose, v = "2026-10-02T00:00:00.000Z") => ({ pose: p, modelVersi: v });
const konfig = { model: "m", resolusi: "720p", durasiDtk: 5 };
const h1 = hashKlip(ujung(a), ujung(sebelah), konfig);
cek("hash: deterministik", h1 === hashKlip(ujung(a), ujung(sebelah), konfig));
cek(
  "hash: getaran < 0,005 m diabaikan",
  h1 === hashKlip(ujung({ ...a, pos: [a.pos[0] + 0.001, a.pos[1], a.pos[2]] }), ujung(sebelah), konfig),
);
cek("hash: pose bergeser 1 m -> berubah", h1 !== hashKlip(ujung({ ...a, pos: [a.pos[0] + 1, a.pos[1], a.pos[2]] }), ujung(sebelah), konfig));
cek("hash: versi maket beda -> berubah", h1 !== hashKlip(ujung(a, "lain"), ujung(sebelah), konfig));
cek("hash: konfigurasi beda -> berubah", h1 !== hashKlip(ujung(a), ujung(sebelah), { ...konfig, resolusi: "1080p" }));
cek("hash: memuat PALET_VERSI", PALET_VERSI >= 1);

// --- 4. Validasi PNG ------------------------------------------------------------------
function crc32(buf: Buffer) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(tipe: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const isi = Buffer.concat([Buffer.from(tipe, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(isi));
  return Buffer.concat([len, isi, crc]);
}
function buatPng(w: number, h: number) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const baris = Buffer.alloc(1 + w * 3); // satu baris cukup utk uji header
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(baris)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
cek("png: 1280×720 valid", validasiFramePng(buatPng(1280, 720)) === null);
cek("png: 640×360 ditolak", (validasiFramePng(buatPng(640, 360)) ?? "").includes("1280×720"));
cek("png: bukan PNG ditolak", validasiFramePng(Buffer.from("GIF89a-bukan-png-sama-sekali-123456789")) === "Frame bukan PNG");
cek("png: terlalu besar ditolak", (validasiFramePng(Buffer.alloc(9 * 1024 * 1024)) ?? "").includes("terlalu besar"));

// --- 5. Biaya -------------------------------------------------------------------------
cek("biaya: 2.0 @720p 5 dtk = $0,76", perkiraanBiayaKlip({ model: "dreamina-seedance-2-0-260128", resolusi: "720p", durasiDtk: 5 }) === 0.76);
cek("biaya: mini @480p 5 dtk = $0,18", perkiraanBiayaKlip({ model: "dreamina-seedance-2-0-mini-260615", resolusi: "480p", durasiDtk: 5 }) === 0.18);
cek("biaya: skala linear terhadap durasi (10 dtk = $1,52)", perkiraanBiayaKlip({ model: "dreamina-seedance-2-0-260128", resolusi: "720p", durasiDtk: 10 }) === 1.52);

// --- 6. Prompt ------------------------------------------------------------------------
const prompt = buatPromptKlip(["perumahan", "komersial"]);
cek("prompt: memuat nama warna atap zona", prompt.includes("terracotta") && prompt.includes("blue-grey"));
cek("prompt: larangan teks/orang/bangunan baru", /No text/.test(prompt) && /No people/.test(prompt) && /Do not add/.test(prompt));

// --- 7. Body request Seedance (fetch di-mock) ----------------------------------------
async function cekRequest() {
  process.env.ARK_API_KEY = "kunci-uji-bukan-asli";
  delete process.env.SEEDANCE_MODEL;
  delete process.env.SEEDANCE_RESOLUTION;
  delete process.env.SEEDANCE_DURASI_DTK;
  const asli = globalThis.fetch;
  let url = "";
  let init: RequestInit | undefined;
  globalThis.fetch = (async (u: string | URL | Request, i?: RequestInit) => {
    url = String(u);
    init = i;
    return new Response(JSON.stringify({ id: "cgt-uji-123" }), { status: 200 });
  }) as typeof fetch;
  try {
    const id = await buatTask({
      prompt: "uji",
      frameAwal: "data:image/png;base64,AAAA",
      frameAkhir: "data:image/png;base64,BBBB",
    });
    cek("seedance: mengembalikan id task", id === "cgt-uji-123");
    cek("seedance: endpoint region ap-southeast", url === "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks", url);
    const h = init?.headers as Record<string, string>;
    cek("seedance: header Bearer", h.Authorization === "Bearer kunci-uji-bukan-asli" && init?.method === "POST");
    const body = JSON.parse(String(init?.body));
    const roles = (body.content as { role?: string; type: string }[]).filter((c) => c.type === "image_url").map((c) => c.role);
    cek("seedance: first_frame + last_frame", roles.join(",") === "first_frame,last_frame");
    cek("seedance: teks prompt di item pertama", body.content[0].type === "text" && body.content[0].text === "uji");
    cek("seedance: ratio adaptive, 720p, 5 dtk", body.ratio === "adaptive" && body.resolution === "720p" && body.duration === 5);
    cek("seedance: tanpa audio & watermark", body.generate_audio === false && body.watermark === false);
    cek("seedance: TIDAK mengirim camera_fixed / seed", !("camera_fixed" in body) && !("seed" in body));
    cek("seedance: model default 2.0", body.model === "dreamina-seedance-2-0-260128");
  } finally {
    globalThis.fetch = asli;
  }

  // 4xx non-429 tidak boleh di-retry (hindari menagih/menunggu sia-sia)
  let panggilan = 0;
  globalThis.fetch = (async () => {
    panggilan++;
    return new Response(JSON.stringify({ error: { code: "InvalidParameter", message: "bad" } }), { status: 400 });
  }) as typeof fetch;
  try {
    let pesan = "";
    await buatTask({ prompt: "x", frameAwal: "a", frameAkhir: "b" }).catch((e) => (pesan = (e as Error).message));
    cek("seedance: HTTP 400 tidak diulang, pesan terbaca", panggilan === 1 && pesan.includes("InvalidParameter: bad"), `${panggilan}x · ${pesan}`);
  } finally {
    globalThis.fetch = asli;
  }
}

cekRequest().then(() => {
  console.log(gagal === 0 ? "\nSemua hijau ✨" : `\n${gagal} pemeriksaan gagal`);
  process.exit(gagal === 0 ? 0 : 1);
});
