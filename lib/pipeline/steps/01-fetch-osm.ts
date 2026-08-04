import osmtogeojson from "osmtogeojson";
import type { Feature, LineString, MultiPolygon, Polygon } from "geojson";
import { klasifikasiJalan } from "../config";
import { queryOverpass } from "../lib/overpass";
import { osmCacheKey, readOsmCache, writeOsmCache } from "../lib/osmCache";
import type { OsmData } from "../types";

/** Ring boundary [lng,lat] -> string poly Overpass "lat lng lat lng ..." (LAT DULU!). */
function toPolyString(boundary: Polygon): string {
  const ring = boundary.coordinates[0];
  // buang titik penutup duplikat
  const open =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
  return open.map(([lng, lat]) => `${lat} ${lng}`).join(" ");
}

/** Pecah MultiPolygon jadi Polygon per-poligon, PERTAHANKAN hole (ring index > 0). */
function explode(f: Feature<Polygon | MultiPolygon>): Feature<Polygon>[] {
  if (f.geometry.type === "Polygon") return [f as Feature<Polygon>];
  return f.geometry.coordinates.map((coords) => ({
    type: "Feature",
    properties: f.properties,
    id: f.id,
    geometry: { type: "Polygon", coordinates: coords },
  }));
}

export async function fetchOsm(boundary: Polygon, projectId?: string): Promise<OsmData> {
  const P = toPolyString(boundary);
  // '>; out skel qt;' WAJIB — tanpa ini node anggota way tidak ikut dan osmtogeojson kosong.
  const q = `[out:json][timeout:60];(
  way["building"](poly:"${P}");
  relation["building"]["type"="multipolygon"](poly:"${P}");
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service)(_link)?$"](poly:"${P}");
  way["natural"="water"](poly:"${P}");
  relation["natural"="water"](poly:"${P}");
  way["waterway"~"^(river|canal|stream)$"](poly:"${P}");
);out body;>;out skel qt;`;

  // Cache per (proyek, hash boundary): regenerate batas yang sama tidak fetch ulang
  const cacheKey = projectId ? osmCacheKey(projectId, boundary) : null;
  let raw = cacheKey ? await readOsmCache(cacheKey) : null;
  if (raw) {
    console.log(`[pipeline] fetch-osm: pakai cache (${cacheKey})`);
  } else {
    raw = await queryOverpass(q);
    if (cacheKey) await writeOsmCache(cacheKey, raw);
  }
  const fc = osmtogeojson(raw);

  const data: OsmData = { buildings: [], roads: [], waterPolys: [], waterLines: [] };

  for (const f of fc.features) {
    const props = (f.properties ?? {}) as Record<string, string>;
    const gtype = f.geometry?.type;

    if (props.building && (gtype === "Polygon" || gtype === "MultiPolygon")) {
      for (const p of explode(f as Feature<Polygon | MultiPolygon>)) {
        p.properties = { ...props, osmId: String(f.id ?? "") };
        data.buildings.push(p);
      }
    } else if (props.highway && gtype === "LineString") {
      data.roads.push({
        hierarki: klasifikasiJalan(props.highway),
        feature: f as Feature<LineString>,
      });
    } else if (props.natural === "water" && (gtype === "Polygon" || gtype === "MultiPolygon")) {
      data.waterPolys.push(...explode(f as Feature<Polygon | MultiPolygon>));
    } else if (props.waterway && gtype === "LineString") {
      data.waterLines.push(f as Feature<LineString>);
    }
  }

  return data;
}
