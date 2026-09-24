import type { Polygon } from "geojson";

/**
 * Konstanta proyeksi equirectangular lokal — SATU sumber untuk pipeline
 * (lib/pipeline/lib/projection.ts) dan basemap, agar model GLB dan citra
 * memakai skala meter yang identik.
 */
export const M_PER_DEG_LAT = 110_574;
export const M_PER_DEG_LNG_EQUATOR = 111_320;

// Konstanta Web-Mercator: keliling bumi / 256 px tile dasar.
const MPP_ZOOM0 = 156543.03392;
// Static Maps: size=640x640 + scale=2 → coverage tanah tetap 640 px "logis".
const UKURAN_PX = 640;

export interface GeoBasemap {
  lat0: number;
  lng0: number;
  zoom: number;
  /** Extent tanah timur–barat (meter model) sisi gambar Static Maps pada zoom terpilih. */
  sisiMeter: number;
  /**
   * Extent utara–selatan dalam meter MODEL. Web Mercator (bola) memakai
   * 111 320 m/° lintang, model equirectangular 110 574 m/° → citra harus
   * sedikit lebih "pendek" (≈0,67 %) agar tepi utara/selatan tetap sejajar model.
   */
  tinggiMeter: number;
}

/**
 * Centroid luas (shoelace) ring boundary — origin BERSAMA model GLF & citra basemap.
 * Jangan ganti dengan rata-rata vertex (turf.centroid): vertex rapat di satu pojok
 * menarik origin puluhan meter dan model bergeser dari citra satelit.
 */
export function pusatBoundary(boundary: Polygon): { lat0: number; lng0: number } | null {
  const ring = boundary.coordinates[0];
  if (!ring || ring.length < 4) return null;

  let luas2 = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    const silang = x1 * y2 - x2 * y1;
    luas2 += silang;
    cx += (x1 + x2) * silang;
    cy += (y1 + y2) * silang;
  }
  if (Math.abs(luas2) < 1e-12) return null; // degenerate
  return { lng0: cx / (3 * luas2), lat0: cy / (3 * luas2) };
}

/**
 * Hitung parameter citra Static Maps yang menutup boundary proyek.
 * Origin scene glTF = pusatBoundary (lihat lib/pipeline/lib/projection.ts),
 * jadi gambar ber-center centroid otomatis sejajar dengan model.
 * Murni & client-safe: dipakai route (pilih zoom) DAN viewer (ukuran plane),
 * sehingga tekstur selalu 1:1 dengan plane tanpa cropping.
 */
export function hitungBasemap(boundary: Polygon): GeoBasemap | null {
  const pusat = pusatBoundary(boundary);
  if (!pusat) return null;
  const { lat0, lng0 } = pusat;
  const ring = boundary.coordinates[0];

  // Bbox meter equirectangular — mirror proyeksi pipeline.
  const cosLat = Math.cos((lat0 * Math.PI) / 180);
  const mPerDegLng = M_PER_DEG_LNG_EQUATOR * cosLat;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [lng, lat] of ring) {
    const x = (lng - lng0) * mPerDegLng;
    const y = (lat - lat0) * M_PER_DEG_LAT;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  // Papan maket = bbox + margin 5% per sisi → 1.10 memastikan plane menutup papan.
  const D = Math.max(maxX - minX, maxY - minY) * 1.1;
  if (!(D > 0)) return null;

  const zoom = Math.min(
    20,
    Math.max(12, Math.floor(Math.log2((MPP_ZOOM0 * cosLat * UKURAN_PX) / D))),
  );
  const sisiMeter = UKURAN_PX * ((MPP_ZOOM0 * cosLat) / 2 ** zoom);
  const tinggiMeter = sisiMeter * (M_PER_DEG_LAT / M_PER_DEG_LNG_EQUATOR);

  return { lat0, lng0, zoom, sisiMeter, tinggiMeter };
}
