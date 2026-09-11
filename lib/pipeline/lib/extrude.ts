import earcut, { flatten } from "earcut";
import type { MeshData, MeterRing } from "../types";

/** Akumulator vertex/index utk satu MeshData. */
export class MeshBuilder {
  positions: number[] = [];
  normals: number[] = [];
  indices: number[] = [];
  featureIds: number[] = [];

  get vertexCount() {
    return this.positions.length / 3;
  }

  addVertex(x: number, y: number, z: number, nx: number, ny: number, nz: number, fid?: number) {
    this.positions.push(x, y, z);
    this.normals.push(nx, ny, nz);
    if (fid !== undefined) this.featureIds.push(fid);
    return this.vertexCount - 1;
  }

  addTriangle(a: number, b: number, c: number) {
    this.indices.push(a, b, c);
  }

  toMeshData(name: string, layer: string, withFeatureIds = false): MeshData | null {
    if (this.indices.length === 0) return null;
    return {
      name,
      layer,
      positions: new Float32Array(this.positions) as Float32Array<ArrayBuffer>,
      normals: new Float32Array(this.normals) as Float32Array<ArrayBuffer>,
      indices: new Uint32Array(this.indices) as Uint32Array<ArrayBuffer>,
      featureIds: withFeatureIds
        ? (new Float32Array(this.featureIds) as Float32Array<ArrayBuffer>)
        : undefined,
    };
  }
}

/** Luas bertanda (shoelace): >0 = CCW pada sistem x-timur/y-utara. */
function signedArea(ring: MeterRing): number {
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

/** Buang titik penutup & duplikat beruntun; paksa winding (outer CCW, hole CW). */
function sanitizeRings(rings: MeterRing[]): MeterRing[] {
  const out: MeterRing[] = [];
  rings.forEach((ring, i) => {
    let r = ring.slice();
    // buang titik penutup
    if (r.length > 1 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1]) {
      r = r.slice(0, -1);
    }
    // buang duplikat beruntun
    r = r.filter((c, j) => j === 0 || c[0] !== r[j - 1][0] || c[1] !== r[j - 1][1]);
    if (r.length < 3) return;
    const ccw = signedArea(r) > 0;
    // winding OSM tidak konsisten — normal dinding terbalik = bangunan "transparan"
    if (i === 0 ? !ccw : ccw) r.reverse();
    out.push(r);
  });
  return out;
}

interface ZFn {
  (x: number, y: number): number;
}

/**
 * Ekstrusi footprint: tutup atas (earcut) + dinding per-edge (normal per-face, vertex tidak
 * dishare), tanpa tutup bawah. Seluruh footprint memakai SATU baseZ (bangunan tidak miring).
 */
export function extrudeInto(
  b: MeshBuilder,
  ringsInput: MeterRing[],
  baseZ: number,
  height: number,
  fid?: number,
  /** true = jangan tutup bagian atas; pemanggil membangun atap sendiri (lihat roof.ts) */
  tanpaTutupAtas = false,
) {
  const rings = sanitizeRings(ringsInput);
  if (rings.length === 0) return;

  const topZ = baseZ + height;

  // (1) tutup atas (dilewati bila atap miring dibangun terpisah)
  if (tanpaTutupAtas) {
    bangunDinding(b, rings, baseZ, topZ, fid);
    return;
  }
  const { vertices, holes, dimensions } = flatten(
    rings.map((r) => r.map(([x, y]) => [x, y])),
  );
  const tri = earcut(vertices, holes, dimensions);
  if (tri.length === 0) return; // triangulasi gagal — skip footprint ini
  const base = b.vertexCount;
  for (let i = 0; i < vertices.length; i += 2) {
    b.addVertex(vertices[i], vertices[i + 1], topZ, 0, 0, 1, fid);
  }
  for (let i = 0; i < tri.length; i += 3) {
    b.addTriangle(base + tri[i], base + tri[i + 1], base + tri[i + 2]);
  }

  // (2) dinding — outer CCW & hole CW membuat rumus normal sama utk keduanya
  bangunDinding(b, rings, baseZ, topZ, fid);
}

/** Dinding vertikal per-edge, normal per-face (vertex tidak dishare). */
function bangunDinding(
  b: MeshBuilder,
  rings: MeterRing[],
  baseZ: number,
  topZ: number,
  fid?: number,
) {
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const [px, py] = ring[i];
      const [qx, qy] = ring[(i + 1) % ring.length];
      const dx = qx - px;
      const dy = qy - py;
      const len = Math.hypot(dx, dy);
      if (len < 1e-9) continue;
      const nx = dy / len;
      const ny = -dx / len;
      const v0 = b.addVertex(px, py, baseZ, nx, ny, 0, fid);
      const v1 = b.addVertex(qx, qy, baseZ, nx, ny, 0, fid);
      const v2 = b.addVertex(qx, qy, topZ, nx, ny, 0, fid);
      const v3 = b.addVertex(px, py, topZ, nx, ny, 0, fid);
      b.addTriangle(v0, v1, v2);
      b.addTriangle(v0, v2, v3);
    }
  }
}

/** Ring tersanitasi (winding benar, tanpa duplikat) — dipakai roof.ts agar konsisten. */
export function sanitizeRingsPublik(rings: MeterRing[]): MeterRing[] {
  return sanitizeRings(rings);
}

/** Poligon datar (jalan/air): earcut, z per-vertex via zAt (drape terrain). */
export function flatPolygonInto(b: MeshBuilder, ringsInput: MeterRing[], zAt: ZFn) {
  const rings = sanitizeRings(ringsInput);
  if (rings.length === 0) return;

  const { vertices, holes, dimensions } = flatten(rings.map((r) => r.map(([x, y]) => [x, y])));
  const tri = earcut(vertices, holes, dimensions);
  if (tri.length === 0) return;
  const base = b.vertexCount;
  for (let i = 0; i < vertices.length; i += 2) {
    const x = vertices[i];
    const y = vertices[i + 1];
    b.addVertex(x, y, zAt(x, y), 0, 0, 1);
  }
  for (let i = 0; i < tri.length; i += 3) {
    b.addTriangle(base + tri[i], base + tri[i + 1], base + tri[i + 2]);
  }
}

/** Balok sumbu-sejajar (papan maket): 6 sisi, normal per-face. */
export function boxInto(
  b: MeshBuilder,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  zBottom: number,
  zTop: number,
) {
  const quad = (
    v: [number, number, number][],
    n: [number, number, number],
  ) => {
    const idx = v.map(([x, y, z]) => b.addVertex(x, y, z, n[0], n[1], n[2]));
    b.addTriangle(idx[0], idx[1], idx[2]);
    b.addTriangle(idx[0], idx[2], idx[3]);
  };
  // atas (+z), CCW dilihat dari atas
  quad(
    [
      [minX, minY, zTop],
      [maxX, minY, zTop],
      [maxX, maxY, zTop],
      [minX, maxY, zTop],
    ],
    [0, 0, 1],
  );
  // bawah (-z)
  quad(
    [
      [minX, minY, zBottom],
      [minX, maxY, zBottom],
      [maxX, maxY, zBottom],
      [maxX, minY, zBottom],
    ],
    [0, 0, -1],
  );
  // selatan (-y)
  quad(
    [
      [minX, minY, zBottom],
      [maxX, minY, zBottom],
      [maxX, minY, zTop],
      [minX, minY, zTop],
    ],
    [0, -1, 0],
  );
  // utara (+y)
  quad(
    [
      [maxX, maxY, zBottom],
      [minX, maxY, zBottom],
      [minX, maxY, zTop],
      [maxX, maxY, zTop],
    ],
    [0, 1, 0],
  );
  // barat (-x)
  quad(
    [
      [minX, maxY, zBottom],
      [minX, minY, zBottom],
      [minX, minY, zTop],
      [minX, maxY, zTop],
    ],
    [-1, 0, 0],
  );
  // timur (+x)
  quad(
    [
      [maxX, minY, zBottom],
      [maxX, maxY, zBottom],
      [maxX, maxY, zTop],
      [maxX, minY, zTop],
    ],
    [1, 0, 0],
  );
}
