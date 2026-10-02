import { HttpError, handleApiError, jsonOk } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rateLimit";
import { urutanTurSchema } from "@/lib/validation";
import { assertTurTulis } from "@/lib/tur/akses";

export const runtime = "nodejs";

/** Susun ulang tur. Body: { ids: [...] } berisi SEMUA id titik proyek, persis satu kali. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await assertTurTulis(id);
    assertRateLimit("tur", user.id);
    const { ids } = urutanTurSchema.parse(await req.json());

    const ada = await prisma.titikTur.findMany({ where: { projectId: id }, select: { id: true } });
    const sama =
      ids.length === ada.length &&
      new Set(ids).size === ids.length &&
      ada.every((t) => ids.includes(t.id));
    if (!sama) throw new HttpError(422, "Daftar id harus memuat semua titik tur tepat satu kali");

    await prisma.$transaction(
      ids.map((tid, i) => prisma.titikTur.update({ where: { id: tid }, data: { urutan: i } })),
    );
    return jsonOk({ ids });
  } catch (e) {
    return handleApiError(e);
  }
}
