import type { Hierarki } from "./types";

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
};
