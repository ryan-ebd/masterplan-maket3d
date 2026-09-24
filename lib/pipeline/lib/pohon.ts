import type { MeshBuilder } from "./extrude";

const SEGMEN = 7;

function segitiga(
  b: MeshBuilder,
  p1: [number, number, number],
  p2: [number, number, number],
  p3: [number, number, number],
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
    b.addVertex(p1[0], p1[1], p1[2], nx, ny, nz),
    b.addVertex(p2[0], p2[1], p2[2], nx, ny, nz),
    b.addVertex(p3[0], p3[1], p3[2], nx, ny, nz),
  );
}

/**
 * Pohon gaya maket arsitektur: batang silinder + tajuk oktaedral (dua kerucut
 * bertumpu pada lingkaran yang sama). ~4×SEGMEN segitiga per pohon — terbaca
 * sebagai pohon dari sudut kamera maket tanpa membebani GLB.
 * Batang dan tajuk masuk builder terpisah agar bisa diberi material berbeda.
 */
export function pohonInto(
  batang: MeshBuilder,
  tajuk: MeshBuilder,
  x: number,
  y: number,
  baseZ: number,
  tinggi: number,
  radiusTajuk: number,
) {
  const zBatang = baseZ + tinggi * 0.35;
  const zTengah = zBatang + (tinggi - tinggi * 0.35) * 0.45;
  const zPuncak = baseZ + tinggi;
  const rBatang = Math.max(0.15, radiusTajuk * 0.08);

  const lingkar = (r: number, z: number): [number, number, number][] =>
    Array.from({ length: SEGMEN }, (_, i) => {
      const a = (i / SEGMEN) * Math.PI * 2;
      return [x + r * Math.cos(a), y + r * Math.sin(a), z];
    });

  // Batang: dinding silinder (tanpa tutup — tertutup tajuk & tanah)
  const bawah = lingkar(rBatang, baseZ - 0.3);
  const atas = lingkar(rBatang, zBatang + 0.2);
  for (let i = 0; i < SEGMEN; i++) {
    const j = (i + 1) % SEGMEN;
    const dx = bawah[j][0] - bawah[i][0];
    const dy = bawah[j][1] - bawah[i][1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = dy / len;
    const ny = -dx / len;
    const v0 = batang.addVertex(bawah[i][0], bawah[i][1], bawah[i][2], nx, ny, 0);
    const v1 = batang.addVertex(bawah[j][0], bawah[j][1], bawah[j][2], nx, ny, 0);
    const v2 = batang.addVertex(atas[j][0], atas[j][1], atas[j][2], nx, ny, 0);
    const v3 = batang.addVertex(atas[i][0], atas[i][1], atas[i][2], nx, ny, 0);
    batang.addTriangle(v0, v1, v2);
    batang.addTriangle(v0, v2, v3);
  }

  // Tajuk: kerucut bawah (puncak di zBatang) + kerucut atas (puncak di zPuncak)
  const cincin = lingkar(radiusTajuk, zTengah);
  const puncakBawah: [number, number, number] = [x, y, zBatang];
  const puncakAtas: [number, number, number] = [x, y, zPuncak];
  for (let i = 0; i < SEGMEN; i++) {
    const j = (i + 1) % SEGMEN;
    segitiga(tajuk, cincin[j], cincin[i], puncakBawah);
    segitiga(tajuk, cincin[i], cincin[j], puncakAtas);
  }
}
