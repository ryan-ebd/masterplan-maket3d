import type Anthropic from "@anthropic-ai/sdk";
import { BOUNDARY_LIMITS, MAX_AREA_M2 } from "@/lib/geo";
import { ZONE_TYPES } from "@/lib/pipeline/config";

const L = BOUNDARY_LIMITS.llm;
/** "6-30 vertex ... luas 0.05-4 km²" — dari BOUNDARY_LIMITS agar prompt & validator sinkron. */
export const BATASAN_LLM =
  `${L.minVertices}-${L.maxVertices} vertex, ` +
  `luas ${L.minAreaM2 / 1e6}-${MAX_AREA_M2 / 1e6} km²`;

// strict:true TIDAK mendukung constraint numerik (minItems/min/max) —
// batasan ditulis di description dan divalidasi server (lib/geo.validateBoundaryRing).
export const TOOL_PROPOSE_BOUNDARY: Anthropic.Tool = {
  name: "propose_boundary",
  description:
    "Usulkan batas wilayah maket sebagai poligon tertutup. Panggil tool ini SETIAP KALI kamu " +
    "sudah menentukan batas. Vertex mengikuti fitur nyata (jalan besar, sungai, rel) dari konteks " +
    "yang diberikan. Urutan koordinat [longitude, latitude] derajat desimal WGS84, counter-clockwise, " +
    `${BATASAN_LLM}, titik pertama TIDAK diulang di akhir (server yang menutup ring).`,
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["polygon", "reasoning", "suggested_zones", "roof_defaults", "assumptions"],
    properties: {
      polygon: {
        type: "array",
        description:
          "Daftar vertex poligon, tiap item [lng, lat] dalam derajat desimal WGS84. " +
          `${L.minVertices}-${L.maxVertices} vertex, tanpa titik penutup. ` +
          "WAJIB terurut mengelilingi titik pusat secara BERLAWANAN ARAH JARUM JAM " +
          "(sudut bearing naik terus, tanpa melompat mundur). Poligon yang menyilang " +
          "dirinya sendiri akan ditolak — ini kesalahan paling sering terjadi saat " +
          "mencoba menelusuri jalan: lebih baik sedikit vertex yang rapi daripada " +
          "banyak vertex yang berbelit.",
        items: { type: "array", items: { type: "number" } },
      },
      reasoning: {
        type: "string",
        description:
          "Alasan pemilihan batas dalam bahasa Indonesia — sebut fitur yang diikuti tiap sisi (jalan, sungai, blok).",
      },
      suggested_zones: {
        type: "array",
        description: "Perkiraan jenis kawasan di dalam batas.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "type"],
          properties: {
            name: { type: "string" },
            type: {
              type: "string",
              description: ZONE_TYPES.join("|"),
            },
          },
        },
      },
      roof_defaults: {
        type: "array",
        description:
          "Tipologi atap per jenis zona — WAJIB diisi, satu entri untuk tiap type di suggested_zones. " +
          "Data OSM Indonesia hampir tak pernah punya roof:shape, jadi inilah satu-satunya sumber " +
          "bentuk atap maket. Tanpa ini semua bangunan jadi kotak beratap datar, tidak sesuai citra satelit.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["zone_type", "shape", "pitch_deg", "note"],
          properties: {
            zone_type: {
              type: "string",
              description: `Persis sama dengan salah satu type di suggested_zones (${ZONE_TYPES.join("|")}).`,
            },
            shape: {
              type: "string",
              description:
                "flat (dak beton) | gabled (pelana) | hipped (limasan) | " +
                "pyramidal (limas, khas masjid) | skillion (sengkuap satu arah)",
            },
            pitch_deg: {
              type: "number",
              description:
                "Kemiringan atap dalam derajat, 5-45 (isi 0 bila shape=flat). Genteng rumah Indonesia lazim 25-35; " +
                "ruko 15-22; gudang 10-18; flat abaikan (isi 0).",
            },
            note: {
              type: "string",
              description:
                "Alasan singkat bahasa Indonesia, mis. \"kampung padat, genteng limasan terlihat jelas dari udara\".",
            },
          },
        },
      },
      assumptions: {
        type: "array",
        description: "Asumsi yang dipakai (mis. tinggi bangunan default).",
        items: { type: "string" },
      },
    },
  },
};

export interface ProposeBoundaryInput {
  polygon: number[][];
  reasoning: string;
  suggested_zones: { name: string; type: string }[];
  roof_defaults?: { zone_type: string; shape: string; pitch_deg?: number; note?: string }[];
  assumptions: string[];
}
