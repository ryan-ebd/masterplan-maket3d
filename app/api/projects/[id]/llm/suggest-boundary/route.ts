import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { llmSuggestSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rateLimit";
import { suggestBoundary } from "@/lib/llm/suggestBoundary";
import { HttpError, assertProjectAssigned, handleApiError, jsonOk, requireRole } from "@/lib/authz";

const STATUS_BOLEH = new Set(["DIPROSES", "REVIEW_PERENCANA", "GAGAL"]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireRole("PERENCANA");
    const { project } = await assertProjectAssigned(id, user);

    if (!STATUS_BOLEH.has(project.status)) {
      throw new HttpError(409, `Usulan LLM tidak tersedia saat status ${project.status}`);
    }
    if (!checkRateLimit(`llm:${user.id}`, 10, 60_000)) {
      throw new HttpError(429, "Terlalu banyak permintaan LLM — tunggu sebentar");
    }

    const { instruction } = llmSuggestSchema.parse(await req.json().catch(() => ({})));
    const hasil = await suggestBoundary(project, instruction);

    const sesi = await prisma.llmSession.findUnique({ where: { projectId: id } });
    const gabungan = [
      ...((sesi?.messages as unknown[] | null) ?? []),
      ...hasil.historyBlocks,
    ] as Prisma.InputJsonValue;

    await prisma.$transaction([
      prisma.project.update({
        where: { id },
        data: {
          boundary: hasil.polygon as unknown as Prisma.InputJsonValue,
          boundaryNote: hasil.reasoning,
          areaM2: hasil.areaM2,
          zonesMeta: hasil.suggested_zones as unknown as Prisma.InputJsonValue,
        },
      }),
      prisma.llmSession.upsert({
        where: { projectId: id },
        create: { projectId: id, messages: gabungan },
        update: { messages: gabungan },
      }),
    ]);

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
