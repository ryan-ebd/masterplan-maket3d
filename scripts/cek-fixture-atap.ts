import { NodeIO } from "@gltf-transform/core";
import path from "node:path";

const NAMA = ["flat", "gabled", "hipped", "pyramidal", "skillion"];

async function main() {
  const doc = await new NodeIO().read(
    path.resolve(process.env.STORAGE_DIR ?? "./storage/models", "fixture/atap.glb"),
  );
  const prim = doc.getRoot().listNodes().find((n) => n.getName() === "layer:bangunan")!
    .getMesh()!.listPrimitives()[0];
  const pos = prim.getAttribute("POSITION")!;
  const fid = prim.getAttribute("_FEATUREID")!;
  const el = [0, 0, 0];
  const per = new Map<number, { level: Set<string>; maxY: number; puncakX: number[]; puncakZ: number[] }>();
  for (let i = 0; i < pos.getCount(); i++) {
    pos.getElement(i, el);
    const id = fid.getScalar(i);
    let r = per.get(id);
    if (!r) per.set(id, (r = { level: new Set(), maxY: -Infinity, puncakX: [], puncakZ: [] }));
    r.level.add(el[1].toFixed(2));
    if (el[1] > r.maxY) { r.maxY = el[1]; r.puncakX = [el[0]]; r.puncakZ = [el[2]]; }
    else if (Math.abs(el[1] - r.maxY) < 1e-4) { r.puncakX.push(el[0]); r.puncakZ.push(el[2]); }
  }
  for (const [id, r] of [...per].sort((a, b) => a[0] - b[0])) {
    // glTF Y-up: X = timur, Z = -utara. Punggungan pelana harus membentang di X (sisi panjang)
    const rentangX = Math.max(...r.puncakX) - Math.min(...r.puncakX);
    const rentangZ = Math.max(...r.puncakZ) - Math.min(...r.puncakZ);
    console.log(
      `${NAMA[id].padEnd(10)} puncak ${r.maxY.toFixed(2)}m | level:${r.level.size} | ` +
      `bentang puncak X=${rentangX.toFixed(1)}m Z=${rentangZ.toFixed(1)}m`,
    );
  }
}
main();
