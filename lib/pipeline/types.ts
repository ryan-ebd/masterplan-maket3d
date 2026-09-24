import type { Feature, LineString, Point, Polygon } from "geojson";
import type { PipelineStepId } from "./config";

export interface PipelineInput {
  projectId: string;
  boundary: Polygon; // [lng,lat], ring tertutup
  zonesMeta?: { name: string; type: string }[] | null;
  /** roof_defaults dari tool propose_boundary (opsional — fallback ke tipologi bawaan). */
  roofDefaults?: RoofDefault[] | null;
}

export type PipelineReport = (progress: number, step: PipelineStepId) => Promise<void>;

export interface LayerMeta {
  id: string;
  label: string;
  nodeName: string;
  defaultVisible: boolean;
}

export interface MeshData {
  name: string; // = layer id
  layer: string;
  positions: Float32Array<ArrayBuffer>;
  normals: Float32Array<ArrayBuffer>;
  indices: Uint32Array<ArrayBuffer>;
  featureIds?: Float32Array<ArrayBuffer>;
}

export type Hierarki = "arteri" | "kolektor" | "lokal";

/** Kerapatan tajuk vegetasi areal OSM → jarak sampel pohon (lihat config POHON). */
export type KerapatanVegetasi = "rapat" | "sedang" | "jarang";

export interface OsmData {
  buildings: Feature<Polygon>[]; // properties: tag OSM + osmId
  roads: { hierarki: Hierarki; feature: Feature<LineString> }[];
  waterPolys: Feature<Polygon>[];
  waterLines: Feature<LineString>[];
  /** natural=tree (titik individu). */
  trees: Feature<Point>[];
  /** natural=tree_row (deretan pohon sepanjang garis). */
  treeRows: Feature<LineString>[];
  /** Areal bervegetasi (wood/forest/scrub/park/garden/grass) untuk disampel jadi titik pohon. */
  vegetation: { kerapatan: KerapatanVegetasi; feature: Feature<Polygon> }[];
}

/** Satu pohon dalam meter lokal (x timur, y utara). */
export interface PohonMeter {
  x: number;
  y: number;
  tinggi: number;
  radiusTajuk: number;
}

export interface BuildingInfo {
  heightM: number;
  heightSource: "osm" | "levels" | "zone" | "default";
  osmId?: string | number;
  /** Bentuk atap: dari tag OSM bila ada, selebihnya estimasi zona (LLM). */
  roofShape: import("./lib/roof").BentukAtap;
  roofHeightM: number;
  roofSource: "osm" | "zone" | "default";
  zoneType: import("./config").ZoneType;
}

/** Usulan tipologi atap per jenis zona — dihasilkan LLM, dipakai step merge-heights. */
export interface RoofDefault {
  zone_type: string;
  shape: string;
  pitch_deg?: number;
  note?: string;
}

/** Ring dalam meter lokal: [x(timur), y(utara)][] */
export type MeterRing = [number, number][];

export interface ProjectedData {
  buildings: { rings: MeterRing[]; info: BuildingInfo }[];
  roads: Record<Hierarki, MeterRing[][]>; // daftar poligon (dengan hole) per hierarki
  water: MeterRing[][];
  trees: PohonMeter[];
  boundaryRing: MeterRing;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  /** Akuntansi bangunan: berapa dari OSM, berapa dipotong di tepi, berapa dibuang & kenapa. */
  laporanBangunan: {
    osm: number;
    dipotong: number;
    dibuang: { luar: number; kink: number; sliver: number; degenerate: number };
  };
}

export interface Heightmap {
  data: Float32Array; // row-major [row*cols + col]
  cols: number;
  rows: number;
  originX: number; // meter lokal pojok kiri-bawah
  originY: number;
  stepMeter: number;
  minElev: number;
  maxElev: number;
  sampleBilinear(x: number, y: number): number; // elevasi ternormalisasi (dikurangi minElev)
}

export interface PipelineResult {
  glbPath: string; // relatif STORAGE_DIR
  stats: Record<string, unknown>;
  layersMeta: LayerMeta[];
  warnings: string[];
}
