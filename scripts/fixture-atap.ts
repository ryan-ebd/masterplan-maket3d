/**
 * Fixture uji 5 bentuk atap berdampingan — untuk memeriksa geometri dengan mata
 * di viewer tanpa memanggil API eksternal.  npm run fixture:atap
 */
import path from "node:path";
import { MeshBuilder, extrudeInto, boxInto } from "@/lib/pipeline/lib/extrude";
import { bangunAtap, type BentukAtap } from "@/lib/pipeline/lib/roof";
import { exportGlb } from "@/lib/pipeline/steps/06-export-glb";
import type { MeshData, MeterRing } from "@/lib/pipeline/types";

const BENTUK: BentukAtap[] = ["flat", "gabled", "hipped", "pyramidal", "skillion"];

async function main() {
  const meshes: MeshData[] = [];
  const bb = new MeshBuilder();

  BENTUK.forEach((bentuk, i) => {
    const x0 = -60 + i * 26;
    // footprint 16 x 10 m (persegi panjang -> arah punggungan harus mengikuti sisi panjang)
    const ring: MeterRing = [
      [x0, -5],
      [x0 + 16, -5],
      [x0 + 16, 5],
      [x0, 5],
    ];
    const tinggiAtap = bentuk === "flat" ? 0 : 3;
    const tinggiBadan = 6;
    extrudeInto(bb, [ring], 0, tinggiBadan, i, bentuk !== "flat");
    bangunAtap(bb, [ring], tinggiBadan, bentuk, tinggiAtap, i);
  });
  meshes.push(bb.toMeshData("bangunan", "bangunan", true)!);

  const pb = new MeshBuilder();
  boxInto(pb, -70, -20, 80, 20, -2, -0.01);
  meshes.push(pb.toMeshData("papan", "papan")!);

  const out = path.resolve(process.env.STORAGE_DIR ?? "./storage/models", "fixture/atap.glb");
  await exportGlb(meshes, out);
  console.log(`Fixture 5 bentuk atap: ${out}`);
  console.log(`Urutan kiri->kanan: ${BENTUK.join(", ")}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
