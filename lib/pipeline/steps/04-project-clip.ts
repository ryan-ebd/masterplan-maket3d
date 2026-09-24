import * as turf from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { clamp } from "@/lib/util";
import { POHON, ROAD_WIDTHS } from "../config";
import { bboxOfMeterRing, type Projector } from "../lib/projection";
import type {
  BuildingInfo,
  Hierarki,
  MeterRing,
  OsmData,
  PohonMeter,
  ProjectedData,
} from "../types";
import { parseHeightMeter } from "./02-merge-heights";

/** Sisa potongan footprint di tepi boundary lebih kecil dari ini dianggap sliver, bukan bangunan. */
const LUAS_MIN_BANGUNAN_M2 = 4;

/** Hash 0..1 deterministik dari posisi — variasi pohon stabil antar regenerate. */
function acak01(a: number, b: number): number {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

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

  // --- Bangunan: kebijakan IRISAN (bukan centroid) + clip ke boundary + sanitasi ---
  // Bangunan di tepi yang centroid-nya di luar tetap ikut: bagian di dalam boundary
  // dipotong dan diekstrusi, sama seperti jalan/air. Hole multipolygon dipertahankan.
  const buildings: { rings: MeterRing[]; info: BuildingInfo }[] = [];
  const laporan: ProjectedData["laporanBangunan"] = {
    osm: osm.buildings.length,
    dipotong: 0,
    dibuang: { luar: 0, kink: 0, sliver: 0, degenerate: 0 },
  };
  const contohDibuang: string[] = [];
  const catatBuang = (alasan: keyof typeof laporan.dibuang, osmId: unknown) => {
    laporan.dibuang[alasan]++;
    if (alasan !== "luar" && contohDibuang.length < 5) contohDibuang.push(`${String(osmId ?? "?")} (${alasan})`);
  };

  for (const b of osm.buildings) {
    const props = (b.properties ?? {}) as Record<string, unknown>;
    try {
      let feat: Feature<Polygon> = turf.cleanCoords(b) as Feature<Polygon>;
      if (turf.kinks(feat).features.length > 0) {
        // self-intersecting: pecah dan ambil bagian terluas (hitung luas tiap bagian sekali)
        const parts = turf.unkinkPolygon(feat).features;
        if (parts.length === 0) throw new Error("kink");
        let bestArea = -Infinity;
        for (const p of parts) {
          const a = turf.area(p);
          if (a > bestArea) {
            bestArea = a;
            feat = p;
          }
        }
        if (turf.kinks(feat).features.length > 0) throw new Error("kink");
      }

      if (!turf.booleanIntersects(feat, boundaryFeat)) {
        catatBuang("luar", props.osmId);
        continue;
      }

      // fast-path: sepenuhnya di dalam -> tanpa boolean-intersect mahal
      let bagian: number[][][][];
      if (turf.booleanWithin(feat, boundaryFeat)) {
        bagian = [feat.geometry.coordinates];
      } else {
        const clipped = turf.intersect(
          turf.featureCollection<Polygon | MultiPolygon>([feat, boundaryFeat as Feature<Polygon>]),
        );
        bagian = explodeCoords(clipped).filter((coords) => turf.area(turf.polygon(coords)) >= LUAS_MIN_BANGUNAN_M2);
        if (bagian.length === 0) {
          catatBuang("sliver", props.osmId);
          continue;
        }
        laporan.dipotong++;
      }

      const info: BuildingInfo = {
        heightM: (props.heightM as number) ?? 7,
        heightSource: (props.heightSource as BuildingInfo["heightSource"]) ?? "default",
        osmId: props.osmId as string | undefined,
        roofShape: (props.roofShape as BuildingInfo["roofShape"]) ?? "flat",
        roofHeightM: (props.roofHeightM as number) ?? 0,
        zoneType: (props.zoneType as BuildingInfo["zoneType"]) ?? "campuran",
        roofSource: (props.roofSource as BuildingInfo["roofSource"]) ?? "default",
      };
      for (const coords of bagian) buildings.push({ rings: projectRings(coords, proj), info });
    } catch (e) {
      catatBuang((e as Error).message === "kink" ? "kink" : "degenerate", props.osmId);
    }
  }
  const { kink, sliver, degenerate } = laporan.dibuang;
  if (kink + sliver + degenerate > 0) {
    warnings.push(
      `${kink + sliver + degenerate} bangunan OSM dilewati (${kink} self-intersecting, ` +
        `${sliver} sisa potongan < ${LUAS_MIN_BANGUNAN_M2} m², ${degenerate} degenerate): ` +
        contohDibuang.join(", "),
    );
  }

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
        const poly = turf.polygon(coords);
        // fast-path: ruas sepenuhnya di dalam boundary tidak perlu boolean-intersect mahal
        if (turf.booleanWithin(poly, boundaryFeat)) {
          roads[r.hierarki].push(projectRings(coords, proj));
          continue;
        }
        // turf v7: intersect menerima SATU FeatureCollection
        const clipped = turf.intersect(
          turf.featureCollection<Polygon | MultiPolygon>([poly, boundaryFeat as Feature<Polygon>]),
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

  // --- Pohon: titik OSM, deretan pohon, lalu sampel areal vegetasi (deterministik) ---
  const trees: PohonMeter[] = [];
  const diDalamBangunan = (lng: number, lat: number) =>
    osm.buildings.some((b) => {
      try {
        return turf.booleanPointInPolygon([lng, lat], b);
      } catch {
        return false;
      }
    });
  const tambahPohon = (lng: number, lat: number, props: Record<string, unknown> = {}) => {
    if (!turf.booleanPointInPolygon([lng, lat], boundaryFeat) || diDalamBangunan(lng, lat)) return;
    const [x, y] = proj.toMeter([lng, lat]);
    const tinggiTag = parseHeightMeter(props.height as string | undefined);
    const tajukTag = parseHeightMeter(props.diameter_crown as string | undefined);
    trees.push({
      x,
      y,
      tinggi: clamp(tinggiTag ?? POHON.tinggiDefault * (0.8 + 0.4 * acak01(x, y)), 3, 30),
      radiusTajuk: clamp(
        tajukTag != null ? tajukTag / 2 : POHON.radiusTajukDefault * (0.8 + 0.4 * acak01(y, x)),
        1,
        10,
      ),
    });
  };
  for (const t of osm.trees) {
    const [lng, lat] = t.geometry.coordinates;
    tambahPohon(lng, lat, (t.properties ?? {}) as Record<string, unknown>);
  }
  for (const row of osm.treeRows) {
    try {
      const panjang = turf.length(row, { units: "meters" });
      for (let d = 0; d <= panjang; d += POHON.jarakTreeRow) {
        const [lng, lat] = turf.along(row, d, { units: "meters" }).geometry.coordinates;
        tambahPohon(lng, lat);
      }
    } catch {
      /* lewati */
    }
  }
  for (const v of osm.vegetation) {
    try {
      if (!turf.booleanIntersects(v.feature, boundaryFeat)) continue;
      const clipped = turf.intersect(
        turf.featureCollection<Polygon | MultiPolygon>([v.feature, boundaryFeat as Feature<Polygon>]),
      );
      if (!clipped) continue;
      // Grid di meter lokal + jitter deterministik, saring dengan point-in-polygon
      const jarak = POHON.jarakSampel[v.kerapatan];
      const [minLng, minLat, maxLng, maxLat] = turf.bbox(clipped);
      const [x0, y0] = proj.toMeter([minLng, minLat]);
      const [x1, y1] = proj.toMeter([maxLng, maxLat]);
      for (let gx = x0 + jarak / 2; gx < x1; gx += jarak) {
        for (let gy = y0 + jarak / 2; gy < y1; gy += jarak) {
          const jx = gx + (acak01(gx, gy) - 0.5) * jarak * 0.6;
          const jy = gy + (acak01(gy, gx) - 0.5) * jarak * 0.6;
          const [lng, lat] = proj.toLngLat(jx, jy);
          if (turf.booleanPointInPolygon([lng, lat], clipped)) tambahPohon(lng, lat);
        }
      }
    } catch {
      /* lewati */
    }
  }

  // --- Boundary & bbox meter ---
  const boundaryRing: MeterRing = boundary.coordinates[0].map((c) =>
    proj.toMeter(c as [number, number]),
  );

  return {
    buildings,
    roads,
    water,
    trees,
    boundaryRing,
    bbox: bboxOfMeterRing(boundaryRing),
    laporanBangunan: laporan,
  };
}
