import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { Document, NodeIO } from "@gltf-transform/core";
import { dedup, prune } from "@gltf-transform/functions";
import { makeMaterial } from "../lib/materials";
import type { MeshData } from "../types";

/**
 * Konversi sumbu lokal (X=timur, Y=utara, Z=atas) -> glTF Y-up right-handed:
 * (x, y, z) -> (x, z, -y). BERLAKU utk posisi DAN normal — lupa minus = peta ter-mirror,
 * lupa normal = pencahayaan gelap sebelah.
 */
function toYUp(src: Float32Array): Float32Array<ArrayBuffer> {
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i += 3) {
    out[i] = src[i];
    out[i + 1] = src[i + 2];
    out[i + 2] = -src[i + 1];
  }
  return out as Float32Array<ArrayBuffer>;
}

/** Tulis GLB per-layer (node "layer:<id>" + extras {layer}) secara atomic. */
export async function exportGlb(
  meshes: MeshData[],
  absOutPath: string,
): Promise<void> {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene("maket");
  doc.getRoot().setDefaultScene(scene);

  for (const m of meshes) {
    const prim = doc
      .createPrimitive()
      .setAttribute(
        "POSITION",
        doc.createAccessor().setType("VEC3").setArray(toYUp(m.positions)).setBuffer(buffer),
      )
      .setAttribute(
        "NORMAL",
        doc.createAccessor().setType("VEC3").setArray(toYUp(m.normals)).setBuffer(buffer),
      )
      .setIndices(doc.createAccessor().setType("SCALAR").setArray(m.indices).setBuffer(buffer))
      .setMaterial(makeMaterial(doc, m.layer));

    if (m.featureIds) {
      prim.setAttribute(
        "_FEATUREID",
        doc.createAccessor().setType("SCALAR").setArray(m.featureIds).setBuffer(buffer),
      );
    }

    const node = doc
      .createNode(`layer:${m.layer}`)
      .setMesh(doc.createMesh(m.name).addPrimitive(prim))
      .setExtras({ layer: m.layer });
    scene.addChild(node);
  }

  await doc.transform(dedup(), prune());

  const bin = await new NodeIO().writeBinary(doc);
  await mkdir(path.dirname(absOutPath), { recursive: true });
  const tmp = absOutPath + ".tmp";
  await writeFile(tmp, bin);
  await rename(tmp, absOutPath); // atomic — request tidak pernah membaca file setengah jadi
}
