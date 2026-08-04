import type { Feature, LineString, Polygon } from "geojson";

export interface PipelineInput {
  projectId: string;
  boundary: Polygon; // [lng,lat], ring tertutup
  zonesMeta?: { name: string; type: string }[] | null;
}

export type PipelineReport = (progress: number, step: string) => Promise<void>;

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

export interface OsmData {
  buildings: Feature<Polygon>[]; // properties: tag OSM + osmId
  roads: { hierarki: Hierarki; feature: Feature<LineString> }[];
  waterPolys: Feature<Polygon>[];
  waterLines: Feature<LineString>[];
}

export interface BuildingInfo {
  heightM: number;
  heightSource: "osm" | "levels" | "zone" | "default";
  osmId?: string | number;
}

/** Ring dalam meter lokal: [x(timur), y(utara)][] */
export type MeterRing = [number, number][];

export interface ProjectedData {
  buildings: { rings: MeterRing[]; info: BuildingInfo }[];
  roads: Record<Hierarki, MeterRing[][]>; // daftar poligon (dengan hole) per hierarki
  water: MeterRing[][];
  boundaryRing: MeterRing;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
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
