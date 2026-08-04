// Proyeksi equirectangular lokal (origin = centroid boundary) — akurat utk kawasan < ~5 km.
import * as turf from "@turf/turf";
import type { Polygon } from "geojson";

const M_PER_DEG_LAT = 110_574;

export interface Projector {
  lat0: number;
  lng0: number;
  mPerDegLng: number;
  toMeter(c: [number, number]): [number, number]; // [lng,lat] -> [x,y] meter
  toLngLat(x: number, y: number): [number, number];
}

export function makeProjector(boundary: Polygon): Projector {
  const c = turf.centroid(turf.feature(boundary)).geometry.coordinates;
  const lng0 = c[0];
  const lat0 = c[1];
  const mPerDegLng = 111_320 * Math.cos((lat0 * Math.PI) / 180);

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
