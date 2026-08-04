import type { Document, Material } from "@gltf-transform/core";

/** Palet gaya maket arsitektur: PBR polos, metallic 0, tanpa tekstur. */
const PALET: Record<string, { rgb: [number, number, number]; rough: number }> = {
  bangunan: { rgb: [0.93, 0.93, 0.9], rough: 0.95 },
  "jalan-arteri": { rgb: [0.6, 0.6, 0.62], rough: 0.9 },
  "jalan-kolektor": { rgb: [0.66, 0.66, 0.68], rough: 0.9 },
  "jalan-lokal": { rgb: [0.72, 0.72, 0.72], rough: 0.9 },
  air: { rgb: [0.8, 0.87, 0.92], rough: 0.4 },
  terrain: { rgb: [0.96, 0.96, 0.94], rough: 1.0 },
  papan: { rgb: [0.85, 0.82, 0.75], rough: 0.8 },
};

export function makeMaterial(doc: Document, layer: string): Material {
  const k = PALET[layer] ?? PALET.bangunan;
  return doc
    .createMaterial(layer)
    .setBaseColorFactor([k.rgb[0], k.rgb[1], k.rgb[2], 1])
    .setMetallicFactor(0)
    .setRoughnessFactor(k.rough)
    .setDoubleSided(false);
}
