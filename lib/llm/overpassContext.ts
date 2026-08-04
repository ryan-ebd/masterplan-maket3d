import "server-only";
import * as turf from "@turf/turf";
import type { Feature, LineString } from "geojson";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const USER_AGENT = "masterplan-maket3d/0.1 (prototype; kontak: ryan@ebede.id)";

interface OverpassGeomElement {
  type: string;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
}

/**
 * Ringkas fitur linear penting radius ~1 km dari titik (jalan besar, sungai, rel)
 * menjadi teks kompak untuk prompt LLM. Gagal apa pun -> null (LLM tetap boleh
 * mengusulkan poligon geometris tanpa konteks).
 */
export async function ringkasKonteks(lat: number, lng: number): Promise<string | null> {
  const q = `[out:json][timeout:25];(
  way["highway"~"^(motorway|trunk|primary|secondary)$"](around:1000,${lat},${lng});
  way["waterway"~"^(river|canal)$"](around:1000,${lat},${lng});
  way["railway"="rail"](around:1000,${lat},${lng});
);out tags geom;`;

  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
        },
        body: "data=" + encodeURIComponent(q),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("json")) continue;
      const body = (await res.json()) as { elements?: OverpassGeomElement[] };
      const lines: string[] = [];

      for (const el of body.elements ?? []) {
        if (lines.length >= 60) break;
        if (!el.geometry || el.geometry.length < 2 || !el.tags) continue;
        const jenis = el.tags.highway
          ? `jalan ${el.tags.highway}`
          : el.tags.waterway
            ? el.tags.waterway === "river"
              ? "sungai"
              : "kanal"
            : "rel kereta";
        const nama = el.tags.name ?? `(${jenis} tanpa nama)`;

        // sederhanakan polyline agar prompt kompak
        let coords = el.geometry.map((g) => [g.lon, g.lat] as [number, number]);
        try {
          const f: Feature<LineString> = turf.lineString(coords);
          const simple = turf.simplify(f, { tolerance: 0.0005, highQuality: false });
          coords = simple.geometry.coordinates as [number, number][];
        } catch {
          /* pakai apa adanya */
        }
        if (coords.length > 8) {
          const langkah = Math.ceil(coords.length / 8);
          coords = coords.filter((_, i) => i % langkah === 0 || i === coords.length - 1);
        }
        const jejak = coords.map(([x, y]) => `[${x.toFixed(5)},${y.toFixed(5)}]`).join(" ");
        lines.push(`- ${nama} (${jenis}): ${jejak}`);
      }

      if (lines.length === 0) return null;
      return lines.join("\n");
    } catch {
      // coba endpoint berikutnya
    }
  }
  return null;
}
