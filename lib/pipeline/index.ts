import { randomUUID } from "node:crypto";
import path from "node:path";
import { STORAGE_ROOT } from "@/lib/storage";
import { LAYER_LABELS } from "./config";
import { bboxOfMeterRing, makeProjector } from "./lib/projection";
import { fetchOsm } from "./steps/01-fetch-osm";
import { mergeHeights } from "./steps/02-merge-heights";
import { fetchElevation } from "./steps/03-fetch-elevation";
import { projectClip } from "./steps/04-project-clip";
import { buildGeometry } from "./steps/05-build-geometry";
import { exportGlb } from "./steps/06-export-glb";
import type { Heightmap, LayerMeta, PipelineInput, PipelineReport, PipelineResult } from "./types";

export type { LayerMeta, PipelineInput, PipelineReport, PipelineResult } from "./types";

export async function runPipeline(
  input: PipelineInput,
  report: PipelineReport,
): Promise<PipelineResult> {
  const warnings: string[] = [];

  // [1] fetch-osm (0 -> 20)
  await report(0, "fetch-osm");
  const osm = await fetchOsm(input.boundary, input.projectId);
  if (osm.buildings.length === 0 && osm.roads.length === 0) {
    warnings.push("Data OSM sangat tipis di wilayah ini — maket mungkin kosong");
  }

  // [2] fetch-heights (20 -> 25)
  await report(20, "fetch-heights");
  mergeHeights(osm, input.zonesMeta, input.roofDefaults);

  // Proyektor dibuat sekali — dipakai elevation (grid meter) & clipping
  const proj = makeProjector(input.boundary);

  // bbox meter dari ring boundary (utk grid elevasi & papan)
  const ringMeter = input.boundary.coordinates[0].map((c) => proj.toMeter(c as [number, number]));
  const bbox = bboxOfMeterRing(ringMeter);

  // [3] fetch-elevation (25 -> 45) — gagal = degradasi flat, bukan gagal pipeline
  await report(25, "fetch-elevation");
  let terrain: Heightmap | null = null;
  try {
    terrain = await fetchElevation(input.boundary, proj, bbox);
    if (!terrain) warnings.push("Terrain flat (relief < 3 m atau key Elevation kosong)");
  } catch (e) {
    warnings.push(`Terrain dilewati: ${(e as Error).message}`);
  }

  // [4] build-geometry: proyeksi + clipping (45 -> 60) lalu geometri (60 -> 85)
  await report(45, "build-geometry");
  const projected = projectClip(osm, input.boundary, proj, warnings);
  await report(60, "build-geometry");
  const geo = buildGeometry(projected, terrain);
  warnings.push(...geo.warnings);

  // [5] export-glb (85 -> 100)
  await report(85, "export-glb");
  const glbPath = `${input.projectId}/${randomUUID()}.glb`;
  await exportGlb(geo.meshes, path.resolve(STORAGE_ROOT, glbPath));

  // Satu layer bisa terdiri dari beberapa mesh (pohon: tajuk + batang) → dedupe per id
  const layersMeta: LayerMeta[] = [...new Set(geo.meshes.map((m) => m.layer))].map((layer) => ({
    id: layer,
    label: LAYER_LABELS[layer] ?? layer,
    nodeName: `layer:${layer}`,
    defaultVisible: true,
  }));

  const stats: Record<string, unknown> = {
    buildings: geo.counts.buildings,
    // Jejak audit: OSM -> dipotong di tepi -> dibuang (alasan) -> mesh. Selisih = "lubang" yang
    // bukan dari pipeline, melainkan bangunan yang memang tidak dipetakan OSM.
    bangunan: projected.laporanBangunan,
    roads: geo.counts.roads,
    waterBodies: geo.counts.waterBodies,
    trees: geo.counts.trees,
    areaM2: null as number | null,
    terrain: terrain ? { minElev: terrain.minElev, maxElev: terrain.maxElev } : null,
    features: geo.features,
    warnings,
  };

  return { glbPath, stats, layersMeta, warnings };
}
