import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { llmChatSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rateLimit";
import { chatLlm } from "@/lib/llm/chat";
import { HttpError, assertProjectAssigned, handleApiError, jsonOk, requireRole } from "@/lib/authz";

const STATUS_BOLEH = new Set(["DIPROSES", "REVIEW_PERENCANA", "GAGAL"]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireRole("PERENCANA");
    const { project } = await assertProjectAssigned(id, user);

    if (!STATUS_BOLEH.has(project.status)) {
      throw new HttpError(409, `Chat LLM tidak tersedia saat status ${project.status}`);
    }
    if (!checkRateLimit(`llm:${user.id}`, 10, 60_000)) {
      throw new HttpError(429, "Terlalu banyak permintaan LLM — tunggu sebentar");
    }

    const { message } = llmChatSchema.parse(await req.json());
    const sesi = await prisma.llmSession.findUnique({ where: { projectId: id } });
    const hasil = await chatLlm(project, (sesi?.messages as unknown[] | null) ?? [], message);

    const gabungan = [
      ...((sesi?.messages as unknown[] | null) ?? []),
      ...hasil.messagesBaru,
    ] as Prisma.InputJsonValue;

    await prisma.$transaction([
      ...(hasil.boundaryDraft
        ? [
            prisma.project.update({
              where: { id },
              data: {
                boundary: hasil.boundaryDraft.polygon as unknown as Prisma.InputJsonValue,
                boundaryNote: hasil.boundaryDraft.reasoning || project.boundaryNote,
                areaM2: hasil.boundaryDraft.areaM2,
              },
            }),
          ]
        : []),
      prisma.llmSession.upsert({
        where: { projectId: id },
        create: { projectId: id, messages: gabungan },
        update: { messages: gabungan },
      }),
    ]);

    return jsonOk({ teks: hasil.teks, boundaryDraft: hasil.boundaryDraft });
  } catch (e) {
    return handleApiError(e);
  }
}
