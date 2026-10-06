/**
 * Geometri atap maket. Data OSM Indonesia hampir tidak pernah punya `roof:shape`,
 * jadi bentuk atap umumnya berasal dari estimasi zona (LLM) — modul ini yang
 * mewujudkannya jadi geometri, bukan sekadar kotak beratap datar.
 *
 * Bentuk yang didukung: flat, gabled (pelana), hipped (limasan), pyramidal (limas),
 * skillion (sengkuap/miring satu arah). Empat terakhir mendominasi lanskap Indonesia.
 */
import earcut, { flatten } from "earcut";
import * as turf from "@turf/turf";
import { sanitizeRingsPublik, type MeshBuilder } from "./extrude";
import type { MeterRing } from "../types";

export type BentukAtap = "flat" | "gabled" | "hipped" | "pyramidal" | "skillion";

/** Di atas ini footprint dianggap terlalu rumit untuk atap miring → tutup datar. */
const MAKS_VERTEX_MIRING = 40;
/** Inset ring (limasan/limas) hanya andal pada footprint sederhana; lebih dari ini pakai pelana MABR. */
const MAKS_VERTEX_INSET = 12;

/** Luas bertanda (shoelace) — dipakai untuk winding & centroid. */
function signedArea(ring: MeterRing): number {
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

function centroid(ring: MeterRing): [number, number] {
  const a = signedArea(ring);
  if (Math.abs(a) < 1e-9) {
    const n = ring.length;
    return [ring.reduce((s, p) => s + p[0], 0) / n, ring.reduce((s, p) => s + p[1], 0) / n];
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    const f = x1 * y2 - x2 * y1;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  return [cx / (6 * a), cy / (6 * a)];
}

/** Convex hull (monotone chain) — basis rotating calipers. */
function convexHull(pts: MeterRing): MeterRing {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: number[], a: number[], b: number[]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const bawah: MeterRing = [];
  for (const q of p) {
    while (bawah.length >= 2 && cross(bawah[bawah.length - 2], bawah[bawah.length - 1], q) <= 0)
      bawah.pop();
    bawah.push(q);
  }
  const atas: MeterRing = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (atas.length >= 2 && cross(atas[atas.length - 2], atas[atas.length - 1], q) <= 0)
      atas.pop();
    atas.push(q);
  }
  bawah.pop();
  atas.pop();
  return bawah.concat(atas);
}

/**
 * Orientasi punggungan atap = sumbu panjang minimum-area bounding rectangle.
 * Inilah yang membuat atap pelana "mengikuti" arah bangunan seperti di citra satelit,
 * bukan asal sumbu X/Y.
 */
export function sudutSumbuPanjang(ring: MeterRing): { theta: number; panjang: number; lebar: number } {
  const hull = convexHull(ring);
  if (hull.length < 3) return { theta: 0, panjang: 1, lebar: 1 };

  let terbaik = { luas: Infinity, theta: 0, panjang: 1, lebar: 1 };
  for (let i = 0; i < hull.length; i++) {
    const [x1, y1] = hull[i];
    const [x2, y2] = hull[(i + 1) % hull.length];
    const t = Math.atan2(y2 - y1, x2 - x1);
    const cos = Math.cos(-t);
    const sin = Math.sin(-t);
    let minU = Infinity,
      maxU = -Infinity,
      minV = Infinity,
      maxV = -Infinity;
    for (const [x, y] of hull) {
      const u = x * cos - y * sin;
      const v = x * sin + y * cos;
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    const w = maxU - minU;
    const h = maxV - minV;
    const luas = w * h;
    if (luas < terbaik.luas) {
      // sumbu panjang = sisi terpanjang persegi panjang
      terbaik =
        w >= h
          ? { luas, theta: t, panjang: w, lebar: h }
          : { luas, theta: t + Math.PI / 2, panjang: h, lebar: w };
    }
  }
  return { theta: terbaik.theta, panjang: terbaik.panjang, lebar: terbaik.lebar };
}

function luasRing(ring: MeterRing): number {
  return Math.abs(signedArea(ring));
}

/**
 * Inset/kerucut dari centroid (limasan, limas) hanya valid bila footprint hampir cembung:
 * pada bentuk L/U segitiga jatuh di luar footprint dan normalnya terbalik (tampak hitam).
 * Toleransi 5% agar derau OSM (lekukan kecil) tidak menurunkan atap yang masih wajar.
 */
function hampirCembung(ring: MeterRing): boolean {
  const hull = convexHull(ring);
  const luasHull = luasRing(hull);
  return luasHull < 1e-9 || luasRing(ring) / luasHull >= 0.95;
}

/** Ring di-inset ke arah centroid (pendekatan praktis untuk limasan/limas). */
function insetRing(ring: MeterRing, rasio: number): MeterRing {
  const [cx, cy] = centroid(ring);
  return ring.map(([x, y]) => [cx + (x - cx) * rasio, cy + (y - cy) * rasio] as [number, number]);
}

function tambahQuad(
  b: MeshBuilder,
  p1: [number, number, number],
  p2: [number, number, number],
  p3: [number, number, number],
  p4: [number, number, number],
  fid?: number,
) {
  // normal per-face dari dua sisi segitiga pertama
  const ux = p2[0] - p1[0],
    uy = p2[1] - p1[1],
    uz = p2[2] - p1[2];
  const vx = p4[0] - p1[0],
    vy = p4[1] - p1[1],
    vz = p4[2] - p1[2];
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz) || 1;
  nx /= len;
  ny /= len;
  nz /= len;
  const i1 = b.addVertex(p1[0], p1[1], p1[2], nx, ny, nz, fid);
  const i2 = b.addVertex(p2[0], p2[1], p2[2], nx, ny, nz, fid);
  const i3 = b.addVertex(p3[0], p3[1], p3[2], nx, ny, nz, fid);
  const i4 = b.addVertex(p4[0], p4[1], p4[2], nx, ny, nz, fid);
  b.addTriangle(i1, i2, i3);
  b.addTriangle(i1, i3, i4);
}

function tambahTri(
  b: MeshBuilder,
  p1: [number, number, number],
  p2: [number, number, number],
  p3: [number, number, number],
  fid?: number,
) {
  const ux = p2[0] - p1[0],
    uy = p2[1] - p1[1],
    uz = p2[2] - p1[2];
  const vx = p3[0] - p1[0],
    vy = p3[1] - p1[1],
    vz = p3[2] - p1[2];
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz) || 1;
  nx /= len;
  ny /= len;
  nz /= len;
  b.addTriangle(
    b.addVertex(p1[0], p1[1], p1[2], nx, ny, nz, fid),
    b.addVertex(p2[0], p2[1], p2[2], nx, ny, nz, fid),
    b.addVertex(p3[0], p3[1], p3[2], nx, ny, nz, fid),
  );
}

/**
 * Potong footprint di garis punggungan (garis lurus pada jarak `pTengah` dari origin
 * sepanjang normal (nx,ny)) menjadi polygon-polygon di sisi + dan -.
 *
 * Wajib untuk atap pelana: tinggi atap adalah fungsi |jarak ke punggungan| yang tidak
 * mulus di punggungan. Triangulasi satu poligon cekung bisa membuat segitiga yang
 * menghubungkan titik di KEDUA sisi; tinggi diinterpolasi lurus di dalamnya sehingga
 * punggungan lenyap dan atap tampak seperti kipas. Dengan memotong dulu, setiap bagian
 * hanya punya satu sisi sehingga tinggi di dalamnya benar-benar linear.
 */
function bagiDiPunggungan(luar: MeterRing, nx: number, ny: number, pTengah: number): MeterRing[] {
  const dx = -ny; // arah punggungan (tegak lurus normal)
  const dy = nx;
  const ox = nx * pTengah; // titik pada garis punggungan
  const oy = ny * pTengah;
  let jari = 1;
  for (const [x, y] of luar) jari = Math.max(jari, Math.hypot(x - ox, y - oy));
  const R = jari * 4 + 10;
  const footprint = turf.polygon([[...luar, luar[0]]]);
  const hasil: MeterRing[] = [];
  for (const sisi of [1, -1]) {
    const k = (a: number, b: number): [number, number] => [
      ox + dx * a + nx * sisi * b,
      oy + dy * a + ny * sisi * b,
    ];
    const kotak = turf.polygon([[k(-R, 0), k(R, 0), k(R, R), k(-R, R), k(-R, 0)]]);
    const potong = turf.intersect(turf.featureCollection([footprint, kotak]));
    if (!potong) continue;
    const polys =
      potong.geometry.type === "Polygon" ? [potong.geometry.coordinates] : potong.geometry.coordinates;
    for (const poly of polys) {
      const ring = poly[0].slice(0, -1) as MeterRing; // buang titik penutup
      if (ring.length >= 3) hasil.push(ring);
    }
  }
  return hasil;
}

/** Tutup datar pada ketinggian z (dipakai flat & puncak limasan terpotong). */
function tutupDatar(b: MeshBuilder, rings: MeterRing[], z: number, fid?: number) {
  const { vertices, holes, dimensions } = flatten(rings.map((r) => r.map(([x, y]) => [x, y])));
  const tri = earcut(vertices, holes, dimensions);
  if (tri.length === 0) return;
  const base = b.vertexCount;
  for (let i = 0; i < vertices.length; i += 2) {
    b.addVertex(vertices[i], vertices[i + 1], z, 0, 0, 1, fid);
  }
  for (let i = 0; i < tri.length; i += 3) {
    b.addTriangle(base + tri[i], base + tri[i + 1], base + tri[i + 2]);
  }
}

/**
 * Bangun atap di atas dinding yang berakhir pada `eaveZ` (tinggi tepi atap).
 * `rings[0]` = ring luar (CCW), sisanya lubang — lubang diabaikan untuk atap miring
 * (courtyard tetap tertutup datar agar tidak bocor).
 */
export function bangunAtap(
  b: MeshBuilder,
  ringsInput: MeterRing[],
  eaveZ: number,
  bentukDiminta: BentukAtap,
  tinggiAtap: number,
  fid?: number,
) {
  // Winding disamakan dengan dinding (outer CCW): normal bidang atap dihitung dari
  // urutan vertex, ring OSM yang CW membuat atap menghadap ke bawah (tersapu backface).
  const rings = sanitizeRingsPublik(ringsInput);
  const luar = rings[0];
  if (!luar || luar.length < 3) return;

  // Footprint rumit atau cekung (L/U/salib) → inset limasan tidak andal; pelana MABR yang
  // dipotong di punggungan tetap benar untuk bentuk cekung.
  const bentuk: BentukAtap =
    (bentukDiminta === "hipped" || bentukDiminta === "pyramidal") &&
    (luar.length > MAKS_VERTEX_INSET || !hampirCembung(luar))
      ? "gabled"
      : bentukDiminta;

  // Atap miring hanya untuk footprint tanpa lubang & tidak terlalu rumit; sisanya datar
  const bolehMiring = rings.length === 1 && tinggiAtap > 0.2 && luar.length <= MAKS_VERTEX_MIRING;
  if (bentuk === "flat" || !bolehMiring) {
    tutupDatar(b, rings, eaveZ, fid);
    return;
  }

  const puncakZ = eaveZ + tinggiAtap;

  if (bentuk === "pyramidal") {
    const [cx, cy] = centroid(luar);
    for (let i = 0; i < luar.length; i++) {
      const [x1, y1] = luar[i];
      const [x2, y2] = luar[(i + 1) % luar.length];
      tambahTri(b, [x1, y1, eaveZ], [x2, y2, eaveZ], [cx, cy, puncakZ], fid);
    }
    return;
  }

  if (bentuk === "hipped") {
    // Limasan: ring di-inset lalu diangkat -> bidang miring keliling + punggungan datar kecil
    const atas = insetRing(luar, 0.42);
    for (let i = 0; i < luar.length; i++) {
      const j = (i + 1) % luar.length;
      tambahQuad(
        b,
        [luar[i][0], luar[i][1], eaveZ],
        [luar[j][0], luar[j][1], eaveZ],
        [atas[j][0], atas[j][1], puncakZ],
        [atas[i][0], atas[i][1], puncakZ],
        fid,
      );
    }
    tutupDatar(b, [atas], puncakZ, fid);
    return;
  }

  if (bentuk === "skillion") {
    // Sengkuap: tinggi bervariasi linear sepanjang sumbu PENDEK
    const { theta } = sudutSumbuPanjang(luar);
    const nx = Math.cos(theta + Math.PI / 2);
    const ny = Math.sin(theta + Math.PI / 2);
    let minP = Infinity;
    let maxP = -Infinity;
    for (const [x, y] of luar) {
      const p = x * nx + y * ny;
      if (p < minP) minP = p;
      if (p > maxP) maxP = p;
    }
    const rentang = maxP - minP || 1;
    const zDi = (x: number, y: number) => eaveZ + tinggiAtap * ((x * nx + y * ny - minP) / rentang);
    // triangulasi datar lalu tiap vertex diangkat sesuai posisinya
    const { vertices, holes, dimensions } = flatten([luar.map(([x, y]) => [x, y])]);
    const tri = earcut(vertices, holes, dimensions);
    for (let i = 0; i < tri.length; i += 3) {
      const t = [tri[i], tri[i + 1], tri[i + 2]].map((k) => {
        const x = vertices[k * 2];
        const y = vertices[k * 2 + 1];
        return [x, y, zDi(x, y)] as [number, number, number];
      });
      tambahTri(b, t[0], t[1], t[2], fid);
    }
    // dinding gable segitiga di sisi miring tertutup oleh dinding vertikal? tidak —
    // tambahkan dinding penutup antara eave dan bidang miring
    for (let i = 0; i < luar.length; i++) {
      const j = (i + 1) % luar.length;
      const [x1, y1] = luar[i];
      const [x2, y2] = luar[j];
      const z1 = zDi(x1, y1);
      const z2 = zDi(x2, y2);
      if (z1 - eaveZ < 1e-6 && z2 - eaveZ < 1e-6) continue;
      tambahQuad(b, [x1, y1, eaveZ], [x2, y2, eaveZ], [x2, y2, z2], [x1, y1, z1], fid);
    }
    return;
  }

  // gabled (pelana): punggungan sepanjang sumbu panjang, tinggi turun linear ke tepi
  const { theta } = sudutSumbuPanjang(luar);
  const [cx, cy] = centroid(luar);
  const nx = Math.cos(theta + Math.PI / 2); // normal sumbu pendek
  const ny = Math.sin(theta + Math.PI / 2);
  const pTengah = cx * nx + cy * ny;
  let maxJarak = 0;
  for (const [x, y] of luar) {
    const d = Math.abs(x * nx + y * ny - pTengah);
    if (d > maxJarak) maxJarak = d;
  }
  const setengahLebar = maxJarak || 1;
  const zDi = (x: number, y: number) =>
    puncakZ - tinggiAtap * Math.min(1, Math.abs(x * nx + y * ny - pTengah) / setengahLebar);

  // Sisipkan titik pada garis punggungan: dipakai untuk DINDING gable di tepi footprint
  // (titik tempat tepi memotong punggungan).
  const diperkaya: MeterRing = [];
  for (let i = 0; i < luar.length; i++) {
    const a = luar[i];
    const c = luar[(i + 1) % luar.length];
    diperkaya.push(a);
    const da = a[0] * nx + a[1] * ny - pTengah;
    const dc = c[0] * nx + c[1] * ny - pTengah;
    if (da * dc < 0) {
      // sisi ini memotong punggungan -> sisipkan titik potongnya
      const t = da / (da - dc);
      diperkaya.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]);
    }
  }

  // Bidang atap: potong di punggungan, triangulasi tiap sisi terpisah (lihat bagiDiPunggungan)
  let bagian = bagiDiPunggungan(luar, nx, ny, pTengah);
  if (bagian.length === 0) bagian = [diperkaya]; // pemotongan gagal -> perilaku lama
  for (const ring of bagian) {
    const { vertices, holes, dimensions } = flatten([ring.map(([x, y]) => [x, y])]);
    const tri = earcut(vertices, holes, dimensions);
    for (let i = 0; i < tri.length; i += 3) {
      const t = [tri[i], tri[i + 1], tri[i + 2]].map((k) => {
        const x = vertices[k * 2];
        const y = vertices[k * 2 + 1];
        return [x, y, zDi(x, y)] as [number, number, number];
      });
      // Bidang atap harus menghadap ke atas: urutan vertex hasil pemotongan bisa CW
      const silang = (t[1][0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[1][1] - t[0][1]) * (t[2][0] - t[0][0]);
      if (silang < 0) [t[1], t[2]] = [t[2], t[1]];
      tambahTri(b, t[0], t[1], t[2], fid);
    }
  }
  // dinding gable (segitiga di ujung punggungan) agar atap tidak "menggantung"
  for (let i = 0; i < diperkaya.length; i++) {
    const j = (i + 1) % diperkaya.length;
    const [x1, y1] = diperkaya[i];
    const [x2, y2] = diperkaya[j];
    const z1 = zDi(x1, y1);
    const z2 = zDi(x2, y2);
    if (z1 - eaveZ < 1e-6 && z2 - eaveZ < 1e-6) continue;
    tambahQuad(b, [x1, y1, eaveZ], [x2, y2, eaveZ], [x2, y2, z2], [x1, y1, z1], fid);
  }
}
