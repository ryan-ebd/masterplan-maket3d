import * as turf from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { ROAD_WIDTHS } from "../config";
import type { Projector } from "../lib/projection";
import type { BuildingInfo, Hierarki, MeterRing, OsmData, ProjectedData } from "../types";

/** Pecah Polygon|MultiPolygon jadi daftar coordinates Polygon (dengan hole). */
function explodeCoords(f: Feature<Polygon | MultiPolygon> | undefined | null): number[][][][] {
  if (!f) return [];
  if (f.geometry.type === "Polygon") return [f.geometry.coordinates];
  return f.geometry.coordinates;
}

function projectRings(rings: number[][][], proj: Projector): MeterRing[] {
  return rings.map((ring) => ring.map((c) => proj.toMeter(c as [number, number])));
}

/**
 * Buffer jalan/air + clipping ke boundary (SEBELUM proyeksi, koordinat geografis),
 * kebijakan bangunan centroid (utuh bila centroid di dalam), lalu proyeksikan ke meter lokal.
 */
export function projectClip(
  osm: OsmData,
  boundary: Polygon,
  proj: Projector,
  warnings: string[],
): ProjectedData {
  const boundaryFeat = turf.feature(boundary);

  // --- Bangunan: kebijakan centroid + sanitasi ---
  const buildings: { rings: MeterRing[]; info: BuildingInfo }[] = [];
  let dibuang = 0;
  for (const b of osm.buildings) {
    try {
      const c = turf.centroid(b);
      if (!turf.booleanPointInPolygon(c, boundaryFeat)) continue;

      let feat: Feature<Polygon> = turf.cleanCoords(b) as Feature<Polygon>;
      if (turf.kinks(feat).features.length > 0) {
        // self-intersecting: pecah dan ambil bagian terluas
        const parts = turf.unkinkPolygon(feat).features;
        if (parts.length === 0) throw new Error("unkink kosong");
        feat = parts.reduce((a, x) => (turf.area(x) > turf.area(a) ? x : a));
        if (turf.kinks(feat).features.length > 0) throw new Error("masih self-intersecting");
      }

      const props = (b.properties ?? {}) as Record<string, unknown>;
      buildings.push({
        rings: projectRings(feat.geometry.coordinates, proj),
        info: {
          heightM: (props.heightM as number) ?? 7,
          heightSource: (props.heightSource as BuildingInfo["heightSource"]) ?? "default",
          osmId: props.osmId as string | undefined,
        },
      });
    } catch {
      dibuang++;
    }
  }
  if (dibuang > 0) warnings.push(`${dibuang} bangunan degenerate dilewati`);

  // --- Jalan: buffer per hierarki lalu clip strict ---
  const roads: Record<Hierarki, MeterRing[][]> = { arteri: [], kolektor: [], lokal: [] };
  for (const r of osm.roads) {
    try {
      const buffered = turf.buffer(r.feature, ROAD_WIDTHS[r.hierarki] / 2, {
        units: "meters",
        steps: 4,
      });
      if (!buffered) continue; // geometri mikro/degenerate -> buffer undefined
      for (const coords of explodeCoords(buffered as Feature<Polygon | MultiPolygon>)) {
        // turf v7: intersect menerima SATU FeatureCollection
        const clipped = turf.intersect(
          turf.featureCollection<Polygon | MultiPolygon>([
            turf.polygon(coords),
            boundaryFeat as Feature<Polygon>,
          ]),
        );
        for (const cc of explodeCoords(clipped)) {
          roads[r.hierarki].push(projectRings(cc, proj));
        }
      }
    } catch {
      // satu ruas gagal — lewati, jangan gagalkan pipeline
    }
  }

  // --- Air: poligon langsung + waterway line di-buffer 3 m, clip strict ---
  const water: MeterRing[][] = [];
  const airFeats: Feature<Polygon>[] = [...osm.waterPolys];
  for (const wl of osm.waterLines) {
    try {
      const buffered = turf.buffer(wl, 3, { units: "meters", steps: 4 });
      if (buffered) {
        for (const coords of explodeCoords(buffered as Feature<Polygon | MultiPolygon>)) {
          airFeats.push(turf.polygon(coords));
        }
      }
    } catch {
      /* lewati */
    }
  }
  for (const w of airFeats) {
    try {
      if (!turf.booleanIntersects(w, boundaryFeat)) continue; // pre-filter murah
      const clipped = turf.intersect(
        turf.featureCollection<Polygon | MultiPolygon>([w, boundaryFeat as Feature<Polygon>]),
      );
      for (const cc of explodeCoords(clipped)) {
        water.push(projectRings(cc, proj));
      }
    } catch {
      /* lewati */
    }
  }

  // --- Boundary & bbox meter ---
  const boundaryRing: MeterRing = boundary.coordinates[0].map((c) =>
    proj.toMeter(c as [number, number]),
  );
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of boundaryRing) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  return { buildings, roads, water, boundaryRing, bbox: { minX, minY, maxX, maxY } };
}
