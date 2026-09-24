import type { Hierarki, KerapatanVegetasi } from "./types";

export const ROAD_WIDTHS: Record<Hierarki, number> = { arteri: 16, kolektor: 10, lokal: 6 };

const ARTERI = /^(motorway|trunk|primary)(_link)?$/;
const KOLEKTOR = /^(secondary|tertiary)(_link)?$/;

export function klasifikasiJalan(highway: string): Hierarki {
  if (ARTERI.test(highway)) return "arteri";
  if (KOLEKTOR.test(highway)) return "kolektor";
  return "lokal";
}

export const Z_OFFSET = { air: 0.1, jalan: 0.3 };

/** Kosakata jenis zona — SATU sumber utk deskripsi tool LLM, prompt, dan peta tinggi. */
export const ZONE_TYPES = ["perumahan", "komersial", "industri", "fasum", "campuran"] as const;
export type ZoneType = (typeof ZONE_TYPES)[number];

// campuran sengaja tanpa entri: jatuh ke default (tinggi campuran tak bisa digeneralisasi)
export const DEFAULT_HEIGHT_ZONA: Partial<Record<ZoneType, number>> & { default: number } = {
  perumahan: 7,
  komersial: 12,
  industri: 10,
  fasum: 8,
  default: 7,
};

export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

export const USER_AGENT = "masterplan-maket3d/0.1 (prototype; kontak: ryan@ebede.id)";

export const ELEVATION_GRID_MAX = 40; // grid maks per sisi (~41x41 titik)

/** Step pipeline (id dipakai report/DB, label dipakai UI progres) — urutan = urutan eksekusi. */
export const PIPELINE_STEPS = [
  { id: "fetch-osm", label: "Mengambil data OSM…" },
  { id: "fetch-heights", label: "Menggabungkan tinggi bangunan…" },
  { id: "fetch-elevation", label: "Mengambil elevasi terrain…" },
  { id: "build-geometry", label: "Membangun geometri 3D…" },
  { id: "export-glb", label: "Menulis berkas GLB…" },
] as const;
export type PipelineStepId = (typeof PIPELINE_STEPS)[number]["id"];

export const STEP_LABELS: Record<string, string> = Object.fromEntries(
  PIPELINE_STEPS.map((s) => [s.id, s.label]),
);

export const LAYER_LABELS: Record<string, string> = {
  bangunan: "Bangunan",
  "jalan-arteri": "Jalan Arteri",
  "jalan-kolektor": "Jalan Kolektor",
  "jalan-lokal": "Jalan Lokal",
  air: "Air",
  terrain: "Terrain",
  papan: "Papan Maket",
  pohon: "Pohon",
};

/**
 * Pohon gaya maket. OSM Indonesia jarang punya natural=tree per pohon, jadi
 * areal vegetasi (taman, hutan kota, rerumputan) disampel jadi titik dengan
 * jarak menurut kerapatan tajuk yang khas untuk tag itu.
 */
export const POHON = {
  tinggiDefault: 8,
  radiusTajukDefault: 3,
  /** Jarak antar pohon sampel (meter) per kerapatan vegetasi areal. */
  jarakSampel: { rapat: 9, sedang: 14, jarang: 18 } as Record<KerapatanVegetasi, number>,
  /** Jarak pohon sepanjang natural=tree_row. */
  jarakTreeRow: 8,
};

/**
 * Tipologi atap default per jenis zona (dipakai bila OSM tak punya `roof:shape`
 * DAN LLM tidak mengusulkan roof_defaults). Angka = rasio tinggi atap terhadap
 * setengah-lebar bangunan; ~0.45 setara kemiringan 24°, 0.6 ≈ 31°.
 */
export const ATAP_ZONA: Record<
  string,
  { shape: "flat" | "gabled" | "hipped" | "pyramidal" | "skillion"; rasio: number }
> = {
  perumahan: { shape: "hipped", rasio: 0.6 }, // limasan genteng ~31° — dominan di kampung kota
  komersial: { shape: "gabled", rasio: 0.35 }, // ruko: pelana di balik parapet
  industri: { shape: "gabled", rasio: 0.2 }, // pabrik/gudang bentang lebar
  fasum: { shape: "hipped", rasio: 0.55 }, // sekolah, kantor kelurahan
  campuran: { shape: "gabled", rasio: 0.45 },
  default: { shape: "hipped", rasio: 0.5 },
};

/**
 * Tipologi rumah ibadah — tinggi & atap khas, TIDAK tunduk pada aturan
 * "≥ TINGGI_ATAP_DATAR_M = dak datar" (nave gereja 14–18 m tetap beratap pelana).
 * `tinggi` dipakai bila OSM tak punya height/levels.
 */
export const ATAP_IBADAH: Record<
  "gereja" | "masjid" | "pura",
  {
    shape: "flat" | "gabled" | "hipped" | "pyramidal" | "skillion";
    rasio: number;
    tinggi: number;
    tinggiKatedral?: number;
  }
> = {
  gereja: { shape: "gabled", rasio: 0.8, tinggi: 14, tinggiKatedral: 18 }, // nave pelana curam
  masjid: { shape: "pyramidal", rasio: 0.6, tinggi: 10 }, // limas tumpang
  pura: { shape: "hipped", rasio: 0.7, tinggi: 9 }, // pura/vihara/klenteng
};

/** Bangunan lebih tinggi dari ini dianggap bertingkat/modern -> atap datar. */
export const TINGGI_ATAP_DATAR_M = 15;
