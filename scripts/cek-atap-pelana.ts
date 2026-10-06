/**
 * Cek geometri atap pada footprint tidak persegi panjang — jalankan: npm run cek:atap-pelana
 * Gejala yang diukur (tanpa browser/API):
 *  1. selisih tinggi permukaan atap terhadap fungsi ideal (pelana: puncakZ turun linear dari
 *     punggungan; sengkuap: naik linear) di titik sampel DALAM tiap segitiga atap;
 *  2. segitiga atap yang normalnya menghadap ke bawah (tersapu backface / tampak hitam);
 *  (limasan/limas: hanya 2 & 3 — tidak ada fungsi ideal sederhana; footprint cekung harus jatuh ke pelana)
 *  3. tinggi maksimum = puncakZ dan semua vertex tetap di dalam footprint.
 */
import { MeshBuilder } from "@/lib/pipeline/lib/extrude";
import { bangunAtap, sudutSumbuPanjang, type BentukAtap } from "@/lib/pipeline/lib/roof";
import type { MeterRing } from "@/lib/pipeline/types";

const EAVE = 6;
const TINGGI = 3;

const FOOTPRINT: Record<string, MeterRing> = {
  persegi: [[0, 0], [16, 0], [16, 10], [0, 10]],
  miring: [[0, 0], [14, 6], [10, 16], [-4, 10]],
  trapesium: [[0, 0], [20, 0], [14, 9], [3, 9]],
  "L": [[0, 0], [20, 0], [20, 6], [7, 6], [7, 18], [0, 18]],
  "U": [[0, 0], [18, 0], [18, 16], [13, 16], [13, 5], [5, 5], [5, 16], [0, 16]],
  // footprint nyata bangunan fasum di proyek-demo-1 (11 titik, cekung) — pemicu atap "kipas"
  nyata: [[-82.704, 12.838], [-40.655, 9.543], [-40.147, 16.055], [-35.373, 18.753], [-34.798, 23.596], [-37.417, 27.223], [-50.502, 28.241], [-50.115, 33.028], [-87.832, 35.981], [-89.225, 18.488], [-82.296, 17.946]],
  "T": [[0, 0], [24, 0], [24, 7], [15, 7], [15, 20], [9, 20], [9, 7], [0, 7]],
};

function centroid(r: MeterRing): [number, number] {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i];
    const [x2, y2] = r[(i + 1) % r.length];
    const f = x1 * y2 - x2 * y1;
    a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
  }
  return [cx / (3 * a), cy / (3 * a)];
}

/** Fungsi tinggi ideal sesuai spesifikasi di roof.ts. */
function idealZ(bentuk: BentukAtap, ring: MeterRing): (x: number, y: number) => number {
  const { theta } = sudutSumbuPanjang(ring);
  const nx = Math.cos(theta + Math.PI / 2);
  const ny = Math.sin(theta + Math.PI / 2);
  if (bentuk === "skillion") {
    let mn = Infinity, mx = -Infinity;
    for (const [x, y] of ring) { const p = x * nx + y * ny; mn = Math.min(mn, p); mx = Math.max(mx, p); }
    return (x, y) => EAVE + TINGGI * ((x * nx + y * ny - mn) / (mx - mn || 1));
  }
  const [cx, cy] = centroid(ring);
  const pT = cx * nx + cy * ny;
  let maxD = 0;
  for (const [x, y] of ring) maxD = Math.max(maxD, Math.abs(x * nx + y * ny - pT));
  return (x, y) => EAVE + TINGGI - TINGGI * Math.min(1, Math.abs(x * nx + y * ny - pT) / maxD);
}

function dalam(ring: MeterRing, x: number, y: number, eps = 1e-6) {
  let masuk = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) masuk = !masuk;
  }
  if (masuk) return true;
  // di tepi dianggap dalam
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    const l = Math.hypot(x2 - x1, y2 - y1);
    const d = Math.abs((x2 - x1) * (y1 - y) - (x1 - x) * (y2 - y1)) / (l || 1);
    const t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / (l * l || 1);
    if (d < eps && t >= -eps && t <= 1 + eps) return true;
  }
  return false;
}

let gagal = 0;
const BARIS: string[] = [];

for (const bentuk of ["gabled", "skillion", "hipped", "pyramidal"] as BentukAtap[]) {
  for (const [nama, ring] of Object.entries(FOOTPRINT)) {
    const b = new MeshBuilder();
    bangunAtap(b, [ring], EAVE, bentuk, TINGGI, 0);
    const P = b.positions;
    const adaIdeal = bentuk === "gabled" || bentuk === "skillion";
    const ideal = adaIdeal ? idealZ(bentuk, ring) : () => 0;
    let maxDev = 0, bawah = 0, luar = 0, maxZ = -Infinity, tri = 0;
    for (let i = 0; i < b.indices.length; i += 3) {
      const v = [0, 1, 2].map((k) => {
        const o = b.indices[i + k] * 3;
        return [P[o], P[o + 1], P[o + 2]] as [number, number, number];
      });
      tri++;
      for (const p of v) maxZ = Math.max(maxZ, p[2]);
      // normal bidang dari urutan vertex
      const ux = v[1][0] - v[0][0], uy = v[1][1] - v[0][1], uz = v[1][2] - v[0][2];
      const wx = v[2][0] - v[0][0], wy = v[2][1] - v[0][1], wz = v[2][2] - v[0][2];
      const nz = ux * wy - uy * wx;
      const nx = uy * wz - uz * wy;
      const ny = uz * wx - ux * wz;
      const luasXY = Math.abs(nz) / 2;
      const miring = Math.hypot(nx, ny, nz) > 1e-9 && Math.abs(nz) / Math.hypot(nx, ny, nz) > 0.3;
      if (miring && nz < 0) bawah++; // bidang atap (bukan dinding gable vertikal) menghadap ke bawah
      // sampel: centroid + 3 titik barisentrik
      for (const [a, c, d] of [[1/3, 1/3, 1/3], [0.6, 0.2, 0.2], [0.2, 0.6, 0.2], [0.2, 0.2, 0.6]]) {
        const x = a * v[0][0] + c * v[1][0] + d * v[2][0];
        const y = a * v[0][1] + c * v[1][1] + d * v[2][1];
        const z = a * v[0][2] + c * v[1][2] + d * v[2][2];
        if (luasXY < 1e-6) continue; // dinding vertikal (gable): bukan permukaan atap
        if (adaIdeal) maxDev = Math.max(maxDev, Math.abs(z - ideal(x, y)));
        if (!dalam(ring, x, y)) luar++;
      }
    }
    const zOk = adaIdeal ? Math.abs(maxZ - (EAVE + TINGGI)) < 1e-6 : maxZ <= EAVE + TINGGI + 1e-6;
    const ok = maxDev < 0.05 && bawah === 0 && luar === 0 && zOk;
    if (!ok) gagal++;
    BARIS.push(
      `${ok ? "✅" : "❌"} ${bentuk.padEnd(8)} ${nama.padEnd(10)} tri=${String(tri).padStart(2)} ` +
        `devMaks=${maxDev.toFixed(2)} m  normalBawah=${bawah}  sampelLuar=${luar}  zMaks=${maxZ.toFixed(2)}`,
    );
  }
}
console.log(BARIS.join("\n"));
console.log(gagal === 0 ? "\nSemua hijau ✨" : `\n${gagal} kombinasi gagal`);
process.exit(gagal === 0 ? 0 : 1);
