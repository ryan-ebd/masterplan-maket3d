/**
 * Fixture GLB statis: papan 120x120 m, jalan lokal 100x6 m, bangunan bentuk-L tinggi 10 m
 * dengan lengan panjang mengarah UTARA (+y) — untuk menguji kontrak layer:* dan konversi
 * sumbu (mirror) di viewer TANPA memanggil API eksternal.
 * Memakai extrude + materials + writer yang SAMA dengan pipeline (reuse, bukan duplikasi).
 *
 * Jalankan: npm run fixture   ->  storage/models/fixture/fixture.glb
 */
import path from "node:path";
import { MeshBuilder, boxInto, extrudeInto, flatPolygonInto } from "@/lib/pipeline/lib/extrude";
import { exportGlb } from "@/lib/pipeline/steps/06-export-glb";
import type { MeshData, MeterRing } from "@/lib/pipeline/types";

export async function buildFixture(outAbsPath: string): Promise<{
  layersMeta: { id: string; label: string; nodeName: string; defaultVisible: boolean }[];
  stats: Record<string, unknown>;
}> {
  const meshes: MeshData[] = [];

  // Papan 120x120, tebal 2, permukaan atas z=-0.01
  const pb = new MeshBuilder();
  boxInto(pb, -60, -60, 60, 60, -2.01, -0.01);
  meshes.push(pb.toMeshData("papan", "papan")!);

  // Jalan lokal: pita 100x6 arah timur-barat, z=0.3
  const rb = new MeshBuilder();
  const jalan: MeterRing = [
    [-50, -3],
    [50, -3],
    [50, 3],
    [-50, 3],
  ];
  flatPolygonInto(rb, [jalan], () => 0.3);
  meshes.push(rb.toMeshData("jalan-lokal", "jalan-lokal")!);

  // Bangunan L: kotak 20x20 dengan lengan 8 m; lengan panjang ke UTARA (+y).
  // Footprint (CCW): mulai pojok kiri-bawah (-10,10), kanan-bawah (10... digeser ke utara papan
  const L: MeterRing = [
    [-10, 15],
    [-2, 15],
    [-2, 27],
    [6, 27],
    [6, 35],
    [-10, 35],
  ];
  const bb = new MeshBuilder();
  extrudeInto(bb, [L], -0.5, 10, 0);
  meshes.push(bb.toMeshData("bangunan", "bangunan", true)!);

  await exportGlb(meshes, outAbsPath);

  return {
    layersMeta: [
      { id: "bangunan", label: "Bangunan", nodeName: "layer:bangunan", defaultVisible: true },
      { id: "jalan-lokal", label: "Jalan Lokal", nodeName: "layer:jalan-lokal", defaultVisible: true },
      { id: "papan", label: "Papan Maket", nodeName: "layer:papan", defaultVisible: true },
    ],
    stats: {
      buildings: 1,
      roads: 1,
      waterBodies: 0,
      fixture: true,
      features: { 0: { heightM: 10, heightSource: "default", osmId: "fixture-L" } },
      warnings: [],
    },
  };
}

async function main() {
  const out = path.resolve(process.env.STORAGE_DIR ?? "./storage/models", "fixture/fixture.glb");
  await buildFixture(out);
  console.log(`Fixture GLB ditulis: ${out}`);
  console.log("Uji orientasi: lengan panjang bangunan L harus mengarah UTARA (menjauhi jalan).");
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
