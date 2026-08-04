import { DEFAULT_HEIGHT_ZONA } from "../config";
import type { OsmData } from "../types";

/**
 * Parser tinggi OSM yang fail-safe: "12", "12.5", "12,5", "12 m", "40 ft", "40'", "12;15".
 * Tidak bisa diparse -> null (fallback berikutnya) — JANGAN biarkan NaN merambat ke geometri.
 */
export function parseHeightMeter(raw?: string): number | null {
  if (!raw) return null;
  const first = raw.split(";")[0].trim().replace(",", ".");
  const m = first.match(/^(-?\d+(?:\.\d+)?)\s*(m|meter|ft|feet|')?\s*$/i);
  if (!m) return null;
  let v = Number(m[1]);
  if (!Number.isFinite(v)) return null;
  const unit = (m[2] ?? "m").toLowerCase();
  if (unit === "ft" || unit === "feet" || unit === "'") v *= 0.3048;
  return v;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Tinggi default kawasan dari zonesMeta LLM (tipe zona pertama yang dikenal). */
function tinggiZona(zonesMeta?: { name: string; type: string }[] | null): number | null {
  if (!zonesMeta) return null;
  for (const z of zonesMeta) {
    const t = z.type?.toLowerCase();
    if (t && t in DEFAULT_HEIGHT_ZONA) return DEFAULT_HEIGHT_ZONA[t];
  }
  return null;
}

/** Prioritas: tag height -> building:levels -> zona LLM -> default 7 m. Mutasi properties. */
export function mergeHeights(osm: OsmData, zonesMeta?: { name: string; type: string }[] | null) {
  const zona = tinggiZona(zonesMeta);

  for (const b of osm.buildings) {
    const props = (b.properties ?? {}) as Record<string, unknown>;
    let heightM: number | null = parseHeightMeter(props.height as string | undefined);
    let source: string = "osm";

    if (heightM == null) {
      const levels = Number(String(props["building:levels"] ?? "").replace(",", "."));
      if (Number.isFinite(levels) && levels > 0) {
        const roof = Number(String(props["roof:levels"] ?? "").replace(",", "."));
        heightM = levels * 3.2 + (Number.isFinite(roof) && roof > 0 ? roof * 2.5 : 0);
        source = "levels";
      }
    }
    if (heightM == null && zona != null) {
      heightM = zona;
      source = "zone";
    }
    if (heightM == null) {
      heightM = DEFAULT_HEIGHT_ZONA.default;
      source = "default";
    }

    props.heightM = clamp(heightM, 3, 150);
    props.heightSource = source;
    b.properties = props;
  }
}
