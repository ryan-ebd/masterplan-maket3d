// Proyeksi equirectangular lokal (origin = centroid luas boundary) — akurat utk kawasan < ~5 km.
import type { Polygon } from "geojson";
import { M_PER_DEG_LAT, M_PER_DEG_LNG_EQUATOR, pusatBoundary } from "@/lib/basemap";

export interface Projector {
  lat0: number;
  lng0: number;
  mPerDegLng: number;
  toMeter(c: [number, number]): [number, number]; // [lng,lat] -> [x,y] meter
  toLngLat(x: number, y: number): [number, number];
}

/** Bbox axis-aligned dari ring meter lokal. */
export function bboxOfMeterRing(ring: [number, number][]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

export function makeProjector(boundary: Polygon): Projector {
  // Origin = pusatBoundary, SAMA dengan center citra basemap (lib/basemap.ts).
  const pusat = pusatBoundary(boundary);
  if (!pusat) throw new Error("Boundary degenerate — luas nol, tidak bisa diproyeksikan");
  const { lat0, lng0 } = pusat;
  const mPerDegLng = M_PER_DEG_LNG_EQUATOR * Math.cos((lat0 * Math.PI) / 180);

  return {
    lat0,
    lng0,
    mPerDegLng,
    toMeter([lng, lat]) {
      return [(lng - lng0) * mPerDegLng, (lat - lat0) * M_PER_DEG_LAT];
    },
    toLngLat(x, y) {
      return [x / mPerDegLng + lng0, y / M_PER_DEG_LAT + lat0];
    },
  };
}
