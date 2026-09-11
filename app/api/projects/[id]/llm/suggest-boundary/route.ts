import type { Prisma } from "@prisma/client";
import { llmSuggestSchema } from "@/lib/validation";
import { assertRateLimit } from "@/lib/rateLimit";
import { suggestBoundary } from "@/lib/llm/suggestBoundary";
import { bacaRiwayatLlm, simpanHasilLlm } from "@/lib/llm/session";
import { assertProjectEditable, handleApiError, jsonOk } from "@/lib/authz";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, project } = await assertProjectEditable(id, "Usulan LLM");
    assertRateLimit("llm", user.id);

    const { instruction } = llmSuggestSchema.parse(await req.json().catch(() => ({})));
    const riwayat = await bacaRiwayatLlm(id);
    const hasil = await suggestBoundary(project, instruction);

    await simpanHasilLlm(id, riwayat, hasil.historyBlocks, {
      boundary: hasil.polygon as unknown as Prisma.InputJsonValue,
      boundaryNote: hasil.reasoning,
      areaM2: hasil.areaM2,
      zonesMeta: hasil.suggested_zones as unknown as Prisma.InputJsonValue,
      roofDefaults: hasil.roof_defaults as unknown as Prisma.InputJsonValue,
    });

    return jsonOk({
      polygon: hasil.polygon,
      reasoning: hasil.reasoning,
      suggested_zones: hasil.suggested_zones,
      assumptions: hasil.assumptions,
      areaM2: hasil.areaM2,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
