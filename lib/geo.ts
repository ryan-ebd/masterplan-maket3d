// SATU-SATUNYA tempat konversi {lat,lng} (Google Maps) <-> [lng,lat] (GeoJSON/turf).
// Tertukar urutan = poligon "di laut Somalia".
import * as turf from "@turf/turf";
import type { Polygon } from "geojson";

export type LatLng = { lat: number; lng: number };
export type LngLat = [number, number];

export function latLngToLngLat(p: LatLng): LngLat {
  return [p.lng, p.lat];
}

export function lngLatToLatLng(c: LngLat): LatLng {
  return { lat: c[1], lng: c[0] };
}

/** Path Google Maps (tak tertutup) -> ring GeoJSON tertutup (titik awal = akhir). */
export function pathToClosedRing(path: LatLng[]): LngLat[] {
  const ring = path.map(latLngToLngLat);
  return closeRing(ring);
}

export function closeRing(ring: LngLat[]): LngLat[] {
  if (ring.length === 0) return ring;
  const [fx, fy] = ring[0];
  const [lx, ly] = ring[ring.length - 1];
  if (fx === lx && fy === ly) return ring;
  return [...ring, ring[0]];
}

/** Kebalikan closeRing: buang titik penutup duplikat bila ada. */
export function openRing(ring: LngLat[]): LngLat[] {
  if (ring.length < 2) return ring;
  const [fx, fy] = ring[0];
  const [lx, ly] = ring[ring.length - 1];
  return fx === lx && fy === ly ? ring.slice(0, -1) : ring;
}

/** Ring GeoJSON tertutup -> path Google Maps (buang titik penutup duplikat). */
export function ringToPath(ring: LngLat[]): LatLng[] {
  return openRing(ring).map(lngLatToLatLng);
}

export function ringToPolygon(ring: LngLat[]): Polygon {
  return { type: "Polygon", coordinates: [closeRing(ring)] };
}

export function polygonAreaM2(polygon: Polygon): number {
  return turf.area(turf.feature(polygon));
}

export const MAX_AREA_M2 = 4_000_000; // 4 km² (batas dokumen desain)

/**
 * Profil batasan boundary per jalur — SATU sumber untuk validator server,
 * deskripsi tool LLM, dan system prompt (jangan hardcode angka di tempat lain).
 */
export const BOUNDARY_LIMITS = {
  manual: { minVertices: 4, maxVertices: 100, minAreaM2: 1000, maxDistanceKm: 5 },
  llm: { minVertices: 6, maxVertices: 30, minAreaM2: 50_000, maxDistanceKm: 3 },
} as const;

/** Format luas m² -> "1.234 km²" (3 desimal — gaya seragam UI & prompt). */
export function formatLuasKm2(m2: number): string {
  return `${(m2 / 1e6).toFixed(3)} km²`;
}

export interface BoundaryValidation {
  ok: boolean;
  error?: string;
  polygon?: Polygon;
  areaM2?: number;
}

/**
 * Validasi poligon boundary (dipakai PUT /boundary DAN loop validasi LLM).
 * ring: [lng,lat][], boleh belum tertutup (akan ditutup).
 */
export function validateBoundaryRing(
  ringInput: LngLat[],
  opts: { minVertices?: number; maxVertices?: number; minAreaM2?: number; center?: LatLng; maxDistanceKm?: number } = {},
): BoundaryValidation {
  const { minVertices = 4, maxVertices = 100, minAreaM2 = 0, center, maxDistanceKm } = opts;

  // hitung vertex unik (tanpa titik penutup)
  const ring = closeRing(
    ringInput.filter(
      (c, i) => i === 0 || c[0] !== ringInput[i - 1][0] || c[1] !== ringInput[i - 1][1],
    ),
  );
  const uniqueVertices = ring.length - 1;
  if (uniqueVertices < minVertices || uniqueVertices > maxVertices) {
    return { ok: false, error: `jumlah vertex harus ${minVertices}–${maxVertices} (sekarang ${uniqueVertices})` };
  }

  for (const [lng, lat] of ring) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) {
      return { ok: false, error: "koordinat di luar rentang WGS84" };
    }
  }

  let feature = turf.polygon([ring]);

  // Self-intersection. Sebutkan KOORDINAT persilangannya: pesan ini dikirim balik
  // ke LLM sebagai tool_result, dan "memotong dirinya sendiri" saja tidak cukup
  // untuk diperbaiki — model perlu tahu ruas mana yang menyilang.
  const kinks = turf.kinks(feature).features;
  if (kinks.length > 0) {
    const titik = kinks
      .slice(0, 3)
      .map((k) => {
        const [x, y] = k.geometry.coordinates;
        return `[${x.toFixed(5)},${y.toFixed(5)}]`;
      })
      .join(" ");
    return {
      ok: false,
      error:
        `poligon memotong dirinya sendiri di ${kinks.length} titik (${titik}` +
        `${kinks.length > 3 ? ", dst." : ""}). Urutkan ulang vertex mengelilingi ` +
        `pusat searah berlawanan jarum jam tanpa melompat bolak-balik`,
    };
  }

  // orientasi CCW (RFC 7946)
  if (turf.booleanClockwise(feature.geometry.coordinates[0])) {
    feature = turf.rewind(feature, { reverse: false }) as typeof feature;
  }

  const areaM2 = turf.area(feature);
  if (areaM2 > MAX_AREA_M2) {
    return { ok: false, error: `luas ${(areaM2 / 1e6).toFixed(2)} km² melebihi batas 4 km²` };
  }
  if (areaM2 < minAreaM2) {
    return { ok: false, error: `luas ${formatLuasKm2(areaM2)} di bawah minimum ${(minAreaM2 / 1e6).toFixed(2)} km²` };
  }

  if (center && maxDistanceKm) {
    const c = turf.point([center.lng, center.lat]);
    for (const coord of feature.geometry.coordinates[0]) {
      const d = turf.distance(c, turf.point(coord), { units: "kilometers" });
      if (d > maxDistanceKm) {
        return { ok: false, error: `vertex berjarak ${d.toFixed(1)} km dari titik proyek (maks ${maxDistanceKm} km)` };
      }
    }
  }

  return { ok: true, polygon: feature.geometry, areaM2 };
}
