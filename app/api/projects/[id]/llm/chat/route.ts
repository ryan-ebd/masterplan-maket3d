import type { Prisma } from "@prisma/client";
import { llmChatSchema } from "@/lib/validation";
import { assertRateLimit } from "@/lib/rateLimit";
import { chatLlm } from "@/lib/llm/chat";
import { bacaRiwayatLlm, simpanHasilLlm } from "@/lib/llm/session";
import { assertProjectEditable, handleApiError, jsonOk } from "@/lib/authz";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, project } = await assertProjectEditable(id, "Chat LLM");
    assertRateLimit("llm", user.id);

    const { message } = llmChatSchema.parse(await req.json());
    const riwayat = await bacaRiwayatLlm(id);
    const hasil = await chatLlm(project, riwayat, message);

    await simpanHasilLlm(
      id,
      riwayat,
      hasil.messagesBaru,
      hasil.boundaryDraft
        ? {
            boundary: hasil.boundaryDraft.polygon as unknown as Prisma.InputJsonValue,
            boundaryNote: hasil.boundaryDraft.reasoning || project.boundaryNote,
            areaM2: hasil.boundaryDraft.areaM2,
          }
        : undefined,
    );

    return jsonOk({ teks: hasil.teks, boundaryDraft: hasil.boundaryDraft });
  } catch (e) {
    return handleApiError(e);
  }
}
