import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { Polygon } from "geojson";
import { HttpError } from "@/lib/authz";
import { LLM_MODEL, SYSTEM_PERENCANA, anthropic } from "./anthropic";
import { TOOL_PROPOSE_BOUNDARY, type ProposeBoundaryInput } from "./tools";
import { validasiUsulan } from "./suggestBoundary";

export interface ChatResult {
  teks: string;
  boundaryDraft: { polygon: Polygon; areaM2: number; reasoning: string } | null;
  messagesBaru: unknown[]; // blok baru utk disimpan ke LlmSession
}

interface ProjectCtx {
  id: string;
  name: string;
  locationLat: number;
  locationLng: number;
  address: string | null;
  boundary: unknown;
  areaM2: number | null;
}

const SYSTEM: Anthropic.TextBlockParam[] = [
  { type: "text", text: SYSTEM_PERENCANA, cache_control: { type: "ephemeral" } },
];

function ambilTeks(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/**
 * Satu putaran chat perencana <-> Claude dengan konteks proyek. Bila model memanggil
 * propose_boundary: validasi SEKALI, kirim tool_result (sukses/error), lalu satu
 * panggilan lanjutan untuk teks penutup.
 */
export async function chatLlm(
  project: ProjectCtx,
  riwayat: unknown[],
  userMessage: string,
): Promise<ChatResult> {
  const boundaryInfo = project.boundary
    ? `boundary saat ini: ${( (project.boundary as Polygon).coordinates?.[0]?.length ?? 1) - 1} vertex, luas ${project.areaM2 ? (project.areaM2 / 1e6).toFixed(3) + " km²" : "?"}`
    : "boundary belum ditentukan";

  const konteksProyek =
    `[Konteks proyek "${project.name}" — titik (${project.locationLat}, ${project.locationLng}), ` +
    `alamat: ${project.address ?? "?"}, ${boundaryInfo}]\n\n`;

  const messages: Anthropic.MessageParam[] = [
    ...(riwayat as Anthropic.MessageParam[]),
    { role: "user", content: konteksProyek + userMessage },
  ];
  const baruMulai = messages.length - 1; // indeks pesan baru pertama

  const res = await anthropic.messages.create({
    model: LLM_MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    tools: [TOOL_PROPOSE_BOUNDARY],
    tool_choice: { type: "auto", disable_parallel_tool_use: true },
    messages,
  });

  // Refusal/max_tokens -> content bisa kosong. Menyimpannya membuat riwayat tak bisa
  // di-replay (API menolak pesan assistant kosong) alias sesi chat mati permanen.
  if (res.stop_reason === "refusal") {
    throw new HttpError(502, "Permintaan ditolak oleh model — coba ubah kalimat Anda");
  }
  if (res.content.length === 0) {
    throw new HttpError(502, "Model tidak mengembalikan jawaban — coba lagi");
  }

  messages.push({ role: "assistant", content: res.content });

  // DEFENSIF: balas SETIAP tool_use — satu id tanpa tool_result = 400 di panggilan berikutnya
  const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  let boundaryDraft: ChatResult["boundaryDraft"] = null;
  let teks = ambilTeks(res.content);

  if (toolUses.length > 0) {
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUses) {
      if (boundaryDraft) {
        results.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          is_error: true,
          content: "Duplikat — hanya satu usulan poligon per giliran yang diproses.",
        });
        continue;
      }
      const input = toolUse.input as unknown as ProposeBoundaryInput;
      const hasil = validasiUsulan(input.polygon ?? [], {
        lat: project.locationLat,
        lng: project.locationLng,
      });
      if (hasil.ok && hasil.polygon && hasil.areaM2 != null) {
        boundaryDraft = {
          polygon: hasil.polygon,
          areaM2: hasil.areaM2,
          reasoning: input.reasoning ?? "",
        };
        results.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: "Poligon diterima dan dimuat ke editor perencana.",
        });
      } else {
        results.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          is_error: true,
          content: `Poligon ditolak: ${hasil.error}.`,
        });
      }
    }
    messages.push({ role: "user", content: results });

    // panggilan lanjutan utk teks penutup yang konsisten dgn tool_result
    const res2 = await anthropic.messages.create({
      model: LLM_MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      tools: [TOOL_PROPOSE_BOUNDARY],
      tool_choice: { type: "none" },
      messages,
    });
    if (res2.stop_reason !== "refusal" && res2.content.length > 0) {
      messages.push({ role: "assistant", content: res2.content });
      const teks2 = ambilTeks(res2.content);
      teks = [teks, teks2].filter(Boolean).join("\n\n");
    }
  }

  if (!teks) teks = boundaryDraft ? "Poligon revisi dimuat ke editor." : "(tanpa jawaban teks)";

  return {
    teks,
    boundaryDraft,
    messagesBaru: JSON.parse(JSON.stringify(messages.slice(baruMulai))) as unknown[],
  };
}
