import { Z_OFFSET } from "../config";
import { MeshBuilder, boxInto, extrudeInto, flatPolygonInto } from "../lib/extrude";
import type { Heightmap, MeshData, ProjectedData } from "../types";

export interface GeometryResult {
  meshes: MeshData[];
  features: Record<number, { heightM: number; heightSource: string; osmId?: string | number }>;
  counts: { buildings: number; roads: number; waterBodies: number };
}

export function buildGeometry(p: ProjectedData, terrain: Heightmap | null): GeometryResult {
  const meshes: MeshData[] = [];
  const features: GeometryResult["features"] = {};

  // --- Bangunan: SATU mesh gabungan + _FEATUREID per vertex ---
  const bb = new MeshBuilder();
  p.buildings.forEach((bld, i) => {
    const outer = bld.rings[0];
    if (!outer || outer.length < 3) return;
    // seluruh footprint satu baseZ (tidak miring), tertanam 0.5 m
    let baseZ = -0.5;
    if (terrain) {
      let cx = 0;
      let cy = 0;
      for (const [x, y] of outer) {
        cx += x;
        cy += y;
      }
      baseZ = terrain.sampleBilinear(cx / outer.length, cy / outer.length) - 0.5;
    }
    extrudeInto(bb, bld.rings, baseZ, bld.info.heightM, i);
    features[i] = { heightM: bld.info.heightM, heightSource: bld.info.heightSource, osmId: bld.info.osmId };
  });
  const bMesh = bb.toMeshData("bangunan", "bangunan", true);
  if (bMesh) meshes.push(bMesh);

  // --- Jalan: satu mesh per hierarki, drape ke terrain ---
  let roadCount = 0;
  for (const h of ["arteri", "kolektor", "lokal"] as const) {
    const rb = new MeshBuilder();
    for (const rings of p.roads[h]) {
      flatPolygonInto(rb, rings, (x, y) =>
        terrain ? terrain.sampleBilinear(x, y) + Z_OFFSET.jalan : Z_OFFSET.jalan,
      );
      roadCount++;
    }
    const m = rb.toMeshData(`jalan-${h}`, `jalan-${h}`);
    if (m) meshes.push(m);
  }

  // --- Air ---
  const wb = new MeshBuilder();
  for (const rings of p.water) {
    flatPolygonInto(wb, rings, (x, y) =>
      terrain ? terrain.sampleBilinear(x, y) + Z_OFFSET.air : Z_OFFSET.air,
    );
  }
  const wMesh = wb.toMeshData("air", "air");
  if (wMesh) meshes.push(wMesh);

  // --- Terrain: grid + skirt ---
  if (terrain) {
    const tb = new MeshBuilder();
    const { cols, rows, stepMeter, originX, originY } = terrain;
    const zOf = (c: number, r: number) => terrain.data[r * cols + c] - terrain.minElev;
    const idxGrid: number[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // normal via central difference
        const zl = zOf(Math.max(0, c - 1), r);
        const zr = zOf(Math.min(cols - 1, c + 1), r);
        const zd = zOf(c, Math.max(0, r - 1));
        const zu = zOf(c, Math.min(rows - 1, r + 1));
        const nx = -(zr - zl) / (2 * stepMeter);
        const ny = -(zu - zd) / (2 * stepMeter);
        const nl = Math.hypot(nx, ny, 1);
        idxGrid[r * cols + c] = tb.addVertex(
          originX + c * stepMeter,
          originY + r * stepMeter,
          zOf(c, r),
          nx / nl,
          ny / nl,
          1 / nl,
        );
      }
    }
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const v00 = idxGrid[r * cols + c];
        const v10 = idxGrid[r * cols + c + 1];
        const v01 = idxGrid[(r + 1) * cols + c];
        const v11 = idxGrid[(r + 1) * cols + c + 1];
        tb.addTriangle(v00, v10, v11);
        tb.addTriangle(v00, v11, v01);
      }
    }
    // skirt keliling turun ke z=-1 (tutup celah tepi)
    const edge: [number, number][] = [];
    for (let c = 0; c < cols; c++) edge.push([c, 0]);
    for (let r = 1; r < rows; r++) edge.push([cols - 1, r]);
    for (let c = cols - 2; c >= 0; c--) edge.push([c, rows - 1]);
    for (let r = rows - 2; r >= 1; r--) edge.push([0, r]);
    for (let i = 0; i < edge.length; i++) {
      const [c1, r1] = edge[i];
      const [c2, r2] = edge[(i + 1) % edge.length];
      const x1 = originX + c1 * stepMeter;
      const y1 = originY + r1 * stepMeter;
      const x2 = originX + c2 * stepMeter;
      const y2 = originY + r2 * stepMeter;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = dy / len;
      const ny = -dx / len;
      const a = tb.addVertex(x1, y1, -1, nx, ny, 0);
      const b2 = tb.addVertex(x2, y2, -1, nx, ny, 0);
      const c3 = tb.addVertex(x2, y2, zOf(c2, r2), nx, ny, 0);
      const d = tb.addVertex(x1, y1, zOf(c1, r1), nx, ny, 0);
      tb.addTriangle(a, b2, c3);
      tb.addTriangle(a, c3, d);
    }
    const tMesh = tb.toMeshData("terrain", "terrain");
    if (tMesh) meshes.push(tMesh);
  }

  // --- Papan maket: bbox + margin 5% ---
  const width = p.bbox.maxX - p.bbox.minX;
  const height = p.bbox.maxY - p.bbox.minY;
  const margin = Math.max(width, height) * 0.05;
  const tebal = Math.max(2, 0.015 * Math.max(width, height));
  const pb = new MeshBuilder();
  boxInto(
    pb,
    p.bbox.minX - margin,
    p.bbox.minY - margin,
    p.bbox.maxX + margin,
    p.bbox.maxY + margin,
    -0.01 - tebal,
    -0.01,
  );
  const pMesh = pb.toMeshData("papan", "papan");
  if (pMesh) meshes.push(pMesh);

  return {
    meshes,
    features,
    counts: {
      buildings: p.buildings.length,
      roads: roadCount,
      waterBodies: p.water.length,
    },
  };
}
