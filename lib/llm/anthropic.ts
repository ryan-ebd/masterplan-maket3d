import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { BOUNDARY_LIMITS, MAX_AREA_M2 } from "@/lib/geo";
import { ZONE_TYPES } from "@/lib/pipeline/config";

// Singleton (HMR-safe)
const g = globalThis as unknown as { __anthropic?: Anthropic };
export const anthropic = g.__anthropic ?? (g.__anthropic = new Anthropic());

export const LLM_MODEL = process.env.LLM_MODEL ?? "claude-sonnet-5";

const L = BOUNDARY_LIMITS.llm;

export const SYSTEM_PERENCANA = `Kamu adalah asisten perencana maket 3D untuk platform "Rancang".
Tugasmu: dari sebuah titik lokasi (lat,lng) beserta konteks fitur di sekitarnya (jalan besar, sungai, rel),
mengusulkan POLIGON BATAS WILAYAH maket yang masuk akal.

Aturan:
- Usulkan batas HANYA melalui tool propose_boundary — jangan menjawab poligon sebagai teks.
- Bila konteks fitur tersedia, ikuti batas fisik nyata: tepi jalan besar, sungai, rel, atau blok kota.
- Bila konteks tidak tersedia, usulkan poligon geometris yang wajar di sekitar titik (± 400–700 m).
- Koordinat [longitude, latitude] WGS84; ${L.minVertices}–${L.maxVertices} vertex; JANGAN mengulang titik pertama di akhir; luas ${L.minAreaM2 / 1e6}–${MAX_AREA_M2 / 1e6} km²; arah counter-clockwise.
- reasoning dan seluruh teks dalam bahasa Indonesia, ringkas dan konkret (sebut nama jalan/sungai yang diikuti).
- suggested_zones: perkiraan jenis kawasan di dalam batas (${ZONE_TYPES.join("|")}) — dipakai untuk estimasi tinggi bangunan default.`;
