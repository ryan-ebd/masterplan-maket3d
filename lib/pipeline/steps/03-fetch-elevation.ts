import type { Polygon } from "geojson";
import { createLimiter, retry } from "@/lib/util";
import { ELEVATION_GRID_MAX } from "../config";
import { encodePolyline } from "../lib/polyline-encode";
import type { Projector } from "../lib/projection";
import type { Heightmap } from "../types";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface ElevationBody {
  status?: string;
  results?: { elevation: number }[];
  error_message?: string;
}

/**
 * Sampel grid elevasi Google Elevation API dalam bbox boundary (meter lokal).
 * Return null bila: key kosong, atau relief < 3 m (mode flat).
 * Lempar error bila API gagal — pemanggil mendegradasi ke flat.
 */
export async function fetchElevation(
  boundary: Polygon,
  proj: Projector,
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
): Promise<Heightmap | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) return null;

  const width = bbox.maxX - bbox.minX;
  const height = bbox.maxY - bbox.minY;
  // Batas bawah 20 m saja: menaikkan batas atas 60 m akan MEMOTONG cakupan grid
  // untuk boundary > 2400 m (cols/rows di-cap 41) sehingga tepi wilayah kehilangan terrain.
  // Untuk wilayah besar, turunkan resolusi — jangan persempit cakupan.
  const stepMeter = Math.max(20, Math.max(width, height) / ELEVATION_GRID_MAX);
  const cols = Math.min(ELEVATION_GRID_MAX + 1, Math.ceil(width / stepMeter) + 1);
  const rows = Math.min(ELEVATION_GRID_MAX + 1, Math.ceil(height / stepMeter) + 1);

  // Susun titik grid (row-major) sebagai lat/lng utk API
  const points: { lat: number; lng: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const [lng, lat] = proj.toLngLat(bbox.minX + c * stepMeter, bbox.minY + r * stepMeter);
      points.push({ lat, lng });
    }
  }

  // Batch <=512 titik per request (limit API), concurrency 3
  const BATCH = 512;
  const limit = createLimiter(3);
  const elevations = new Float32Array(points.length);
  const tugas: Promise<void>[] = [];
  for (let i = 0; i < points.length; i += BATCH) {
    const start = i;
    const slice = points.slice(i, i + BATCH);
    tugas.push(
      limit(() =>
        retry(
          async () => {
            const url =
              "https://maps.googleapis.com/maps/api/elevation/json?locations=enc:" +
              encodeURIComponent(encodePolyline(slice)) +
              "&key=" +
              key;
            const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
            const body = (await res.json()) as ElevationBody;
            // OVER_QUERY_LIMIT dkk datang sebagai HTTP 200 — WAJIB cek body.status
            if (body.status !== "OK" || !body.results) {
              throw new Error(`Elevation API: ${body.status ?? res.status} ${body.error_message ?? ""}`);
            }
            body.results.forEach((r, j) => {
              elevations[start + j] = r.elevation;
            });
          },
          { retries: 2, minDelayMs: 1000, factor: 4 },
        ),
      ),
    );
  }
  await Promise.all(tugas);

  // Box-blur 3x3 satu pass — SRTM 30 m bertangga tanpa ini
  const blurred = new Float32Array(elevations.length);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let sum = 0;
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
            sum += elevations[rr * cols + cc];
            n++;
          }
        }
      }
      blurred[r * cols + c] = sum / n;
    }
  }

  let minElev = Infinity;
  let maxElev = -Infinity;
  for (const v of blurred) {
    if (v < minElev) minElev = v;
    if (v > maxElev) maxElev = v;
  }
  if (maxElev - minElev < 3) return null; // kawasan datar — terrain tak perlu

  const hm: Heightmap = {
    data: blurred,
    cols,
    rows,
    originX: bbox.minX,
    originY: bbox.minY,
    stepMeter,
    minElev,
    maxElev,
    sampleBilinear(x: number, y: number): number {
      const fx = clamp((x - bbox.minX) / stepMeter, 0, cols - 1);
      const fy = clamp((y - bbox.minY) / stepMeter, 0, rows - 1);
      const c0 = Math.floor(fx);
      const r0 = Math.floor(fy);
      const c1 = Math.min(c0 + 1, cols - 1);
      const r1 = Math.min(r0 + 1, rows - 1);
      const tx = fx - c0;
      const ty = fy - r0;
      const v00 = blurred[r0 * cols + c0];
      const v10 = blurred[r0 * cols + c1];
      const v01 = blurred[r1 * cols + c0];
      const v11 = blurred[r1 * cols + c1];
      const v = v00 * (1 - tx) * (1 - ty) + v10 * tx * (1 - ty) + v01 * (1 - tx) * ty + v11 * tx * ty;
      return v - minElev; // ternormalisasi: dasar maket = 0
    },
  };
  return hm;
}
