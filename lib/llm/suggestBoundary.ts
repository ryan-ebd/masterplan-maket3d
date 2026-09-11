import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { Polygon } from "geojson";
import { HttpError } from "@/lib/authz";
import { BOUNDARY_LIMITS, validateBoundaryRing, type LngLat } from "@/lib/geo";
import { LLM_MODEL, SYSTEM_PERENCANA, anthropic } from "./anthropic";
import { TOOL_PROPOSE_BOUNDARY, type ProposeBoundaryInput } from "./tools";
import { ringkasKonteks } from "./overpassContext";

export interface SuggestResult {
  polygon: Polygon;
  areaM2: number;
  reasoning: string;
  suggested_zones: { name: string; type: string }[];
  roof_defaults: { zone_type: string; shape: string; pitch_deg?: number; note?: string }[];
  assumptions: string[];
  historyBlocks: unknown[]; // riwayat blok content utuh utk LlmSession
}

interface ProjectPoint {
  id: string;
  locationLat: number;
  locationLng: number;
  address: string | null;
}

const SYSTEM: Anthropic.TextBlockParam[] = [
  { type: "text", text: SYSTEM_PERENCANA, cache_control: { type: "ephemeral" } },
];

export function validasiUsulan(
  polygon: number[][],
  center: { lat: number; lng: number },
): ReturnType<typeof validateBoundaryRing> {
  return validateBoundaryRing(polygon as LngLat[], { ...BOUNDARY_LIMITS.llm, center });
}

/** Panggil Claude dgn tool_choice paksa + loop perbaikan via tool_result is_error (maks 3). */
export async function suggestBoundary(
  project: ProjectPoint,
  instruction?: string,
): Promise<SuggestResult> {
  const { locationLat: lat, locationLng: lng } = project;
  const konteks = await ringkasKonteks(lat, lng);

  const pesanAwal =
    `Titik pusat proyek: (${lat}, ${lng})\n` +
    `Alamat: ${project.address ?? "(tidak diketahui)"}\n` +
    `Instruksi perencana: ${instruction?.trim() || "maket kawasan sekitar ± 500 m dari titik, ikuti batas fisik terdekat"}\n\n` +
    (konteks
      ? `Fitur di sekitar (radius 1 km):\n${konteks}`
      : "(Konteks Overpass tidak tersedia — usulkan poligon geometris yang masuk akal di sekitar titik.)");

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: pesanAwal }];

  for (let percobaan = 0; percobaan < 3; percobaan++) {
    const res = await anthropic.messages.create({
      model: LLM_MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      tools: [TOOL_PROPOSE_BOUNDARY],
      tool_choice: { type: "tool", name: "propose_boundary", disable_parallel_tool_use: true },
      messages,
    });

    if (res.stop_reason === "refusal") {
      throw new HttpError(502, "Permintaan ditolak oleh model — coba ubah instruksi Anda");
    }

    const toolUse = res.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (!toolUse) {
      throw new HttpError(502, "Model tidak memanggil tool propose_boundary");
    }

    const input = toolUse.input as unknown as ProposeBoundaryInput;
    const hasil = validasiUsulan(input.polygon ?? [], { lat, lng });

    messages.push({ role: "assistant", content: res.content });

    if (hasil.ok && hasil.polygon && hasil.areaM2 != null) {
      messages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: "Poligon diterima dan dimuat ke editor perencana.",
          },
        ],
      });
      return {
        polygon: hasil.polygon,
        areaM2: hasil.areaM2,
        reasoning: input.reasoning ?? "",
        suggested_zones: input.suggested_zones ?? [],
        roof_defaults: input.roof_defaults ?? [],
        assumptions: input.assumptions ?? [],
        historyBlocks: JSON.parse(JSON.stringify(messages)) as unknown[],
      };
    }

    console.warn(
      `[suggestBoundary] percobaan ${percobaan + 1}/3 ditolak: ${hasil.error} ` +
        `(vertex=${input.polygon?.length ?? 0})`,
    );
    messages.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolUse.id,
          is_error: true,
          content: `Poligon ditolak: ${hasil.error}. Perbaiki lalu panggil propose_boundary lagi.`,
        },
      ],
    });
  }

  throw new HttpError(502, "Model tidak menghasilkan poligon valid setelah 3 percobaan");
}
