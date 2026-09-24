import osmtogeojson from "osmtogeojson";
import type { Feature, LineString, MultiPolygon, Point, Polygon } from "geojson";
import { openRing, type LngLat } from "@/lib/geo";
import { klasifikasiJalan } from "../config";
import { queryOverpass } from "../lib/overpass";
import { osmCacheKey, readOsmCache, writeOsmCache } from "../lib/osmCache";
import type { KerapatanVegetasi, OsmData } from "../types";

/** Ring boundary [lng,lat] -> string poly Overpass "lat lng lat lng ..." (LAT DULU!). */
function toPolyString(boundary: Polygon): string {
  return openRing(boundary.coordinates[0] as LngLat[])
    .map(([lng, lat]) => `${lat} ${lng}`)
    .join(" ");
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

/** Tag areal vegetasi → kerapatan tajuk (null = bukan vegetasi). */
function kerapatanVegetasi(props: Record<string, string>): KerapatanVegetasi | null {
  if (props.natural === "wood" || props.landuse === "forest") return "rapat";
  if (props.natural === "scrub" || props.landuse === "orchard") return "sedang";
  if (
    ["park", "garden"].includes(props.leisure) ||
    ["grass", "village_green", "meadow"].includes(props.landuse)
  )
    return "jarang";
  return null;
}

/** Bbox Overpass "south,west,north,east" dari ring boundary. */
function toBboxString(boundary: Polygon): string {
  let s = Infinity,
    w = Infinity,
    n = -Infinity,
    e = -Infinity;
  for (const [lng, lat] of boundary.coordinates[0] as LngLat[]) {
    if (lat < s) s = lat;
    if (lat > n) n = lat;
    if (lng < w) w = lng;
    if (lng > e) e = lng;
  }
  return `${s},${w},${n},${e}`;
}

/**
 * Query Overpass. Mengubah daftar tag di sini WAJIB menaikkan OSM_QUERY_VERSION
 * (lib/osmCache.ts) agar cache boundary lama tidak menahan data tanpa fitur baru.
 */
export async function fetchOsm(boundary: Polygon, projectId?: string): Promise<OsmData> {
  const P = toPolyString(boundary);
  // Bangunan diambil per BBOX, bukan poly: filter (poly:) Overpass tidak menjamin way yang
  // hanya menyilang tepi tanpa node di dalam ikut terpilih. Irisan sesungguhnya diputuskan
  // projectClip (booleanIntersects + clip), jadi kelebihan ambil di sini aman.
  const B = toBboxString(boundary);
  // '>; out skel qt;' WAJIB — tanpa ini node anggota way tidak ikut dan osmtogeojson kosong.
  const q = `[out:json][timeout:60];(
  way["building"](${B});
  relation["building"]["type"="multipolygon"](${B});
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service)(_link)?$"](poly:"${P}");
  way["natural"="water"](poly:"${P}");
  relation["natural"="water"](poly:"${P}");
  way["waterway"~"^(river|canal|stream)$"](poly:"${P}");
  node["natural"="tree"](poly:"${P}");
  way["natural"~"^(wood|scrub|tree_row)$"](poly:"${P}");
  relation["natural"~"^(wood|scrub)$"]["type"="multipolygon"](poly:"${P}");
  way["landuse"~"^(grass|forest|orchard|village_green|meadow)$"](poly:"${P}");
  way["leisure"~"^(park|garden)$"](poly:"${P}");
);out body;>;out skel qt;`;

  // Cache per (proyek, hash boundary, versi query): regenerate batas yang sama tidak fetch ulang
  const cacheKey = projectId ? osmCacheKey(projectId, boundary) : null;
  let raw = cacheKey ? await readOsmCache(cacheKey) : null;
  if (raw) {
    console.log(`[pipeline] fetch-osm: pakai cache (${cacheKey})`);
  } else {
    raw = await queryOverpass(q);
    if (cacheKey) await writeOsmCache(cacheKey, raw);
  }
  const fc = osmtogeojson(raw);

  const data: OsmData = {
    buildings: [],
    roads: [],
    waterPolys: [],
    waterLines: [],
    trees: [],
    treeRows: [],
    vegetation: [],
  };

  for (const f of fc.features) {
    const props = (f.properties ?? {}) as Record<string, string>;
    const gtype = f.geometry?.type;
    const areal = gtype === "Polygon" || gtype === "MultiPolygon";

    if (props.building && areal) {
      for (const p of explode(f as Feature<Polygon | MultiPolygon>)) {
        p.properties = { ...props, osmId: String(f.id ?? "") };
        data.buildings.push(p);
      }
    } else if (props.highway && gtype === "LineString") {
      data.roads.push({
        hierarki: klasifikasiJalan(props.highway),
        feature: f as Feature<LineString>,
      });
    } else if (props.natural === "water" && areal) {
      data.waterPolys.push(...explode(f as Feature<Polygon | MultiPolygon>));
    } else if (props.waterway && gtype === "LineString") {
      data.waterLines.push(f as Feature<LineString>);
    } else if (props.natural === "tree" && gtype === "Point") {
      data.trees.push(f as Feature<Point>);
    } else if (props.natural === "tree_row" && gtype === "LineString") {
      data.treeRows.push(f as Feature<LineString>);
    } else if (areal) {
      const kerapatan = kerapatanVegetasi(props);
      if (kerapatan) {
        for (const p of explode(f as Feature<Polygon | MultiPolygon>)) {
          data.vegetation.push({ kerapatan, feature: p });
        }
      }
    }
  }

  return data;
}
