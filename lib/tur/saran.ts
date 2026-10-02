// Geometri tur (MURNI, client-safe, tanpa three/prisma): pose gambaran umum, pose di sisi
// luar bangunan, saran otomatis titik, dan peringatan ruas yang terlalu jauh untuk
// diinterpolasi Seedance. Koordinat adegan glTF: meter, Y-up, x timur, z = -utara,
// origin = centroid boundary (lib/basemap.ts).
import type { Pose, Vec3 } from "./types";

export const FOV_TUR = 40; // derajat vertikal — SAMA dengan Canvas di AdeganMaket & ambilFrame

/** Hasil pemindaian geometri `bangunan` di viewer (KameraBridge.pusatBangunan). */
export interface RingkasBangunan {
  featureId: number;
  /** centroid bbox footprint pada bidang tanah */
  x: number;
  z: number;
  /** sisi terpanjang bbox footprint (m) */
  lebar: number;
  /** luas bbox footprint (m²) — pembanding antar bangunan, bukan luas presisi */
  luas: number;
  yDasar: number;
  yAtas: number;
}

export interface InfoFitur {
  heightM?: number;
  zoneType?: string;
}

export interface SaranTitik {
  nama: string;
  featureId: number;
  pose: Pose;
}

const rad = (d: number) => (d * Math.PI) / 180;

/** Pose miring dari tepi selatan yang memuat seluruh papan maket (aspek 16:9). */
export function poseGambaranUmum(L: number, yDasar = 0): Pose {
  const jarak = 0.85 * L;
  const elev = rad(36);
  return {
    pos: [0, yDasar + jarak * Math.sin(elev), jarak * Math.cos(elev)],
    target: [0, yDasar, -0.04 * L],
  };
}

/**
 * Pose di sisi LUAR bangunan, menghadap ke tengah papan (latar belakangnya kawasan,
 * bukan tepi papan). Bangunan di tengah -> dari selatan.
 */
export function poseSisiLuar(b: RingkasBangunan): Pose {
  const tinggi = Math.max(3, b.yAtas - b.yDasar);
  const jarak = Math.max(45, 2.2 * b.lebar, 1.6 * tinggi);
  const panjang = Math.hypot(b.x, b.z);
  const ux = panjang > Math.max(10, b.lebar) ? b.x / panjang : 0;
  const uz = panjang > Math.max(10, b.lebar) ? b.z / panjang : 1;
  return {
    pos: [b.x + ux * jarak, b.yAtas + 0.45 * jarak, b.z + uz * jarak],
    target: [b.x, b.yDasar + 0.45 * tinggi, b.z],
  };
}

const NAMA_ZONA: Record<string, string> = {
  perumahan: "Kawasan perumahan",
  komersial: "Kawasan komersial",
  industri: "Kawasan industri",
  fasum: "Fasilitas umum",
  campuran: "Kawasan campuran",
};

const jarak2 = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[2] - b[2]);

/**
 * Pilih hingga `maks` titik menonjol: bangunan tertinggi + yang terluas per zoneType,
 * saling berjarak minimal 0,12 L supaya tur tidak berputar-putar di satu sudut, lalu
 * urutkan dengan nearest-neighbor mulai dari pose gambaran umum.
 */
export function sarankanTitik(
  bangunan: RingkasBangunan[],
  fitur: Record<string, InfoFitur | undefined>,
  L: number,
  maks = 5,
): SaranTitik[] {
  if (bangunan.length === 0) return [];
  const minJarak = 0.12 * L;
  const info = (b: RingkasBangunan) => fitur[String(b.featureId)];
  const tinggiDari = (b: RingkasBangunan) => info(b)?.heightM ?? b.yAtas - b.yDasar;

  const kandidat: { b: RingkasBangunan; nama: string }[] = [];
  const tertinggi = [...bangunan].sort((a, b) => tinggiDari(b) - tinggiDari(a) || b.luas - a.luas)[0];
  kandidat.push({ b: tertinggi, nama: `Bangunan tertinggi (${Math.round(tinggiDari(tertinggi))} m)` });

  const perZona = new Map<string, RingkasBangunan>();
  for (const b of bangunan) {
    const z = info(b)?.zoneType;
    if (!z) continue;
    const cur = perZona.get(z);
    if (!cur || b.luas > cur.luas) perZona.set(z, b);
  }
  for (const [z, b] of [...perZona.entries()].sort((a, c) => c[1].luas - a[1].luas)) {
    kandidat.push({ b, nama: NAMA_ZONA[z] ?? `Kawasan ${z}` });
  }
  // cadangan bila zona sedikit: bangunan terluas lainnya
  for (const b of [...bangunan].sort((a, c) => c.luas - a.luas).slice(0, 12)) {
    kandidat.push({ b, nama: "Bangunan besar" });
  }

  const terpilih: { b: RingkasBangunan; nama: string }[] = [];
  for (const k of kandidat) {
    if (terpilih.length >= maks) break;
    if (terpilih.some((t) => t.b.featureId === k.b.featureId)) continue;
    if (terpilih.some((t) => Math.hypot(t.b.x - k.b.x, t.b.z - k.b.z) < minJarak)) continue;
    terpilih.push(k);
  }

  // nearest-neighbor dari kamera gambaran umum
  const sisa = terpilih.map((t) => ({ ...t, pose: poseSisiLuar(t.b) }));
  const urut: SaranTitik[] = [];
  let posisi: Vec3 = poseGambaranUmum(L).pos;
  while (sisa.length > 0) {
    let iMin = 0;
    for (let i = 1; i < sisa.length; i++) {
      if (jarak2(sisa[i].pose.pos, posisi) < jarak2(sisa[iMin].pose.pos, posisi)) iMin = i;
    }
    const [dipilih] = sisa.splice(iMin, 1);
    urut.push({ nama: dipilih.nama, featureId: dipilih.b.featureId, pose: dipilih.pose });
    posisi = dipilih.pose.pos;
  }
  return urut;
}

/** Arah pandang pada bidang tanah (radian). */
function yaw(p: Pose): number {
  return Math.atan2(p.target[0] - p.pos[0], -(p.target[2] - p.pos[2]));
}

/**
 * Seedance mengisi gerakan di antara dua frame; bila pose terlalu berbeda (kamera
 * berpindah jauh atau berputar >100°) hasilnya cenderung morf, bukan terbang mulus.
 * Mengembalikan pesan peringatan, atau null bila ruas aman.
 */
export function periksaLoncatan(a: Pose, b: Pose, L: number): string | null {
  const geser = Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1], a.pos[2] - b.pos[2]);
  let putar = Math.abs(yaw(a) - yaw(b));
  if (putar > Math.PI) putar = 2 * Math.PI - putar;
  const masalah: string[] = [];
  if (geser > 0.8 * L) masalah.push(`kamera berpindah ${Math.round(geser)} m`);
  if (putar > rad(100)) masalah.push(`arah pandang berputar ${Math.round((putar * 180) / Math.PI)}°`);
  if (masalah.length === 0) return null;
  return `Loncatan terlalu jauh (${masalah.join(", ")}) — tambahkan titik perantara agar klip tidak morf.`;
}

export const sama = (a: Vec3, b: Vec3, eps = 0.01) =>
  Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps && Math.abs(a[2] - b[2]) < eps;
