import type { Polygon } from "geojson";

// Konstanta Web-Mercator: keliling bumi / 256 px tile dasar.
const MPP_ZOOM0 = 156543.03392;
// Static Maps: size=640x640 + scale=2 → coverage tanah tetap 640 px "logis".
const UKURAN_PX = 640;

export interface GeoBasemap {
  lat0: number;
  lng0: number;
  zoom: number;
  /** Extent tanah (meter) sisi gambar Static Maps pada zoom terpilih. */
  sisiMeter: number;
}

/**
 * Hitung parameter citra Static Maps yang menutup boundary proyek.
 * Origin scene glTF = centroid boundary (lihat lib/pipeline/lib/projection.ts),
 * jadi gambar ber-center centroid otomatis sejajar dengan model.
 * Murni & client-safe: dipakai route (pilih zoom) DAN viewer (ukuran plane),
 * sehingga tekstur selalu 1:1 dengan plane tanpa cropping.
 */
export function hitungBasemap(boundary: Polygon): GeoBasemap | null {
  const ring = boundary.coordinates[0];
  if (!ring || ring.length < 4) return null;

  // Centroid shoelace (area-weighted) — konsisten dengan turf.centroid untuk poligon kecil.
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
  const lng0 = cx / (3 * luas2);
  const lat0 = cy / (3 * luas2);

  // Bbox meter equirectangular — mirror proyeksi pipeline.
  const mPerDegLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const mPerDegLat = 110574;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [lng, lat] of ring) {
    const x = (lng - lng0) * mPerDegLng;
    const y = (lat - lat0) * mPerDegLat;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  // Papan maket = bbox + margin 5% per sisi → 1.10 memastikan plane menutup papan.
  const D = Math.max(maxX - minX, maxY - minY) * 1.1;
  if (!(D > 0)) return null;

  const cosLat = Math.cos((lat0 * Math.PI) / 180);
  const zoom = Math.min(
    20,
    Math.max(12, Math.floor(Math.log2((MPP_ZOOM0 * cosLat * UKURAN_PX) / D))),
  );
  const sisiMeter = UKURAN_PX * ((MPP_ZOOM0 * cosLat) / 2 ** zoom);

  return { lat0, lng0, zoom, sisiMeter };
}
