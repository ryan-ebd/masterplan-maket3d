import type Anthropic from "@anthropic-ai/sdk";

// strict:true TIDAK mendukung constraint numerik (minItems/min/max) —
// batasan ditulis di description dan divalidasi server (lib/geo.validateBoundaryRing).
export const TOOL_PROPOSE_BOUNDARY: Anthropic.Tool = {
  name: "propose_boundary",
  description:
    "Usulkan batas wilayah maket sebagai poligon tertutup. Panggil tool ini SETIAP KALI kamu " +
    "sudah menentukan batas. Vertex mengikuti fitur nyata (jalan besar, sungai, rel) dari konteks " +
    "yang diberikan. Urutan koordinat [longitude, latitude] derajat desimal WGS84, counter-clockwise, " +
    "6-30 vertex, titik pertama TIDAK diulang di akhir (server yang menutup ring), luas 0.05-4 km².",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["polygon", "reasoning", "suggested_zones", "assumptions"],
    properties: {
      polygon: {
        type: "array",
        description:
          "Daftar vertex poligon, tiap item [lng, lat] dalam derajat desimal WGS84. 6-30 vertex, tanpa titik penutup.",
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
              description: "perumahan|komersial|industri|fasum|campuran",
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
  assumptions: string[];
}
