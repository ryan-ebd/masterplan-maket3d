import { clamp } from "@/lib/util";
import { ATAP_ZONA, DEFAULT_HEIGHT_ZONA, TINGGI_ATAP_DATAR_M, type ZoneType } from "../config";
import type { BentukAtap } from "../lib/roof";
import type { OsmData, RoofDefault } from "../types";

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

/** Normalisasi nilai roof:shape OSM / usulan LLM ke bentuk yang didukung geometri. */
export function normalisasiBentukAtap(raw?: string): BentukAtap | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (["flat", "datar", "dak"].includes(v)) return "flat";
  if (["gabled", "gable", "pelana", "kampung"].includes(v)) return "gabled";
  if (["hipped", "hip", "limasan", "limas-perisai", "perisai"].includes(v)) return "hipped";
  if (["pyramidal", "pyramid", "limas", "tajug"].includes(v)) return "pyramidal";
  if (["skillion", "shed", "monopitch", "sengkuap", "miring"].includes(v)) return "skillion";
  // bentuk OSM lain (dome, gambrel, mansard, round...) -> paling mendekati limasan
  if (["dome", "onion", "conical", "cone"].includes(v)) return "pyramidal";
  if (["half-hipped", "gambrel", "mansard", "hip-and-gable"].includes(v)) return "hipped";
  return null;
}

/** Kemiringan (derajat) -> rasio tinggi atap terhadap setengah-lebar bangunan. */
function pitchKeRasio(deg?: number): number | null {
  if (deg == null || !Number.isFinite(deg) || deg <= 0 || deg >= 80) return null;
  return Math.tan((deg * Math.PI) / 180);
}

/** Tinggi default kawasan dari zonesMeta LLM (tipe zona pertama yang dikenal). */
function tinggiZona(zonesMeta?: { name: string; type: string }[] | null): number | null {
  if (!zonesMeta) return null;
  for (const z of zonesMeta) {
    const t = z.type?.toLowerCase() as ZoneType | undefined;
    const v = t ? DEFAULT_HEIGHT_ZONA[t] : undefined;
    if (v != null) return v;
  }
  return null;
}

/** Prioritas: tag height -> building:levels -> zona LLM -> default 7 m. Mutasi properties. */
export function mergeHeights(
  osm: OsmData,
  zonesMeta?: { name: string; type: string }[] | null,
  roofDefaults?: RoofDefault[] | null,
) {
  const zona = tinggiZona(zonesMeta);

  // Tipologi atap dicari PER ZONA, bukan satu untuk seluruh kawasan.
  const cariAtap = (zt: ZoneType) => {
    const llm = roofDefaults?.find((r) => r.zone_type?.toLowerCase() === zt);
    const bawaan = ATAP_ZONA[zt] ?? ATAP_ZONA.default;
    const bentuk = normalisasiBentukAtap(llm?.shape) ?? bawaan.shape;
    return { bentuk, rasio: pitchKeRasio(llm?.pitch_deg) ?? bawaan.rasio, dariLlm: !!llm };
  };

  for (const b of osm.buildings) {
    const props = (b.properties ?? {}) as Record<string, unknown>;
    const dim = dimensiFootprint(b);
    const zonaBangunan = tipologiBangunan(props, dim);
    const atapZona = cariAtap(zonaBangunan);

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
    if (heightM == null) {
      // Tinggi khas menurut tipologi bangunan itu sendiri; zona kawasan dari LLM
      // hanya dipakai bila tipologinya tak tertebak (campuran).
      const perTipologi = DEFAULT_HEIGHT_ZONA[zonaBangunan];
      if (perTipologi != null) {
        heightM = perTipologi;
        source = "zone";
      } else if (zona != null) {
        heightM = zona;
        source = "zone";
      }
    }
    if (heightM == null) {
      heightM = DEFAULT_HEIGHT_ZONA.default;
      source = "default";
    }

    const tinggiFinal = clamp(heightM, 3, 150);
    props.heightM = tinggiFinal;
    props.heightSource = source;

    // --- Bentuk & tinggi atap ---
    const dariOsm = normalisasiBentukAtap(props["roof:shape"] as string | undefined);
    let bentuk: BentukAtap;
    let roofSource: "osm" | "zone" | "default";
    if (dariOsm) {
      bentuk = dariOsm;
      roofSource = "osm";
    } else if (tinggiFinal >= TINGGI_ATAP_DATAR_M) {
      // gedung bertingkat: dak beton, bukan genteng
      bentuk = "flat";
      roofSource = "default";
    } else {
      bentuk = atapZona.bentuk;
      roofSource = atapZona.dariLlm ? "zone" : "default";
    }

    // Tinggi atap: tag roof:height -> roof:levels -> rasio x setengah-lebar footprint
    let roofH = parseHeightMeter(props["roof:height"] as string | undefined);
    if (roofH == null) {
      const rl = Number(String(props["roof:levels"] ?? "").replace(",", "."));
      if (Number.isFinite(rl) && rl > 0) roofH = rl * 2.5;
    }
    if (roofH == null && bentuk !== "flat") {
      roofH = atapZona.rasio * (dim.pendek / 2);
    }
    props.roofShape = bentuk;
    props.roofHeightM = bentuk === "flat" ? 0 : clamp(roofH ?? 2, 0.6, 12);
    props.roofSource = roofSource;
    props.zoneType = zonaBangunan;

    b.properties = props;
  }
}

/**
 * Dimensi footprint (meter, kasar dari bbox geografis): sisi pendek, sisi panjang,
 * dan luas. Dipakai dua hal — tinggi atap proporsional, dan menebak tipologi
 * bangunan saat OSM hanya menulis `building=yes` (mayoritas data Indonesia).
 */
function dimensiFootprint(f: { geometry: { coordinates: number[][][] } }): {
  pendek: number;
  panjang: number;
  luasM2: number;
} {
  const ring = f.geometry.coordinates?.[0];
  if (!ring || ring.length < 3) return { pendek: 8, panjang: 8, luasM2: 64 };
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lng, lat] of ring as [number, number][]) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  const lat0 = (minLat + maxLat) / 2;
  const lebarM = (maxLng - minLng) * 111_320 * Math.cos((lat0 * Math.PI) / 180);
  const tinggiM = (maxLat - minLat) * 110_574;
  const pendek = Math.max(1, Math.min(lebarM, tinggiM));
  const panjang = Math.max(pendek, Math.max(lebarM, tinggiM));
  // bbox melebih-lebihkan bangunan menyerong; 0.82 mendekatkan ke luas sebenarnya
  return { pendek, panjang, luasM2: pendek * panjang * 0.82 };
}

/**
 * Tebak tipologi bangunan -> jenis zona, agar tiap bangunan dapat atap yang pantas.
 * Tanpa ini seluruh kawasan memakai SATU bentuk atap (mis. semua jadi limas masjid),
 * yang langsung terlihat salah saat maket dibandingkan citra satelit.
 *
 * Tag OSM dipakai lebih dulu; tapi di Indonesia mayoritas bangunan hanya
 * `building=yes`, jadi ukuran dan kelangsingan footprint jadi penentu berikutnya.
 */
export function tipologiBangunan(
  props: Record<string, unknown>,
  dim: { pendek: number; panjang: number; luasM2: number },
): ZoneType {
  const building = String(props.building ?? "").toLowerCase();
  const amenity = String(props.amenity ?? "").toLowerCase();

  if (amenity === "place_of_worship" || ["mosque", "church", "temple", "chapel", "cathedral", "shrine"].includes(building))
    return "fasum";
  if (
    ["school", "hospital", "university", "college", "kindergarten", "public", "civic", "government", "train_station", "hall"].includes(building) ||
    ["school", "hospital", "university", "college", "kindergarten", "library", "townhall", "clinic", "police", "fire_station"].includes(amenity)
  )
    return "fasum";
  if (["house", "detached", "residential", "apartments", "bungalow", "terrace", "semidetached_house", "dormitory"].includes(building))
    return "perumahan";
  if (["industrial", "warehouse", "factory", "hangar", "manufacture"].includes(building)) return "industri";
  if (["commercial", "retail", "shop", "kiosk", "supermarket", "office", "hotel", "mall"].includes(building) || props.shop || props.office)
    return "komersial";

  // --- building=yes / tak dikenal: tebak dari geometri ---
  const { pendek, panjang, luasM2 } = dim;
  const kelangsingan = panjang / Math.max(1, pendek);

  if (luasM2 >= 2000) return kelangsingan >= 2.5 ? "industri" : "komersial"; // gudang/pabrik vs mal/gedung
  if (luasM2 <= 120) return "perumahan"; // rumah kampung padat
  // Ruko: petak sempit-memanjang khas Indonesia (muka <= 12 m, lebih panjang ke belakang)
  if (pendek <= 12 && kelangsingan >= 1.8) return "komersial";
  if (luasM2 <= 400) return "perumahan";
  return "campuran";
}
