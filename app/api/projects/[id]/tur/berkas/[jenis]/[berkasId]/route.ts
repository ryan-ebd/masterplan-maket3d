import { HttpError, handleApiError } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { assertTurBaca } from "@/lib/tur/akses";
import { absAman } from "@/lib/tur/storage";
import { sajikanBerkas } from "@/lib/tur/stream";

export const runtime = "nodejs";

/** Sajikan frame diam (`frame/<titikId>`) atau video klip (`klip/<klipId>`, dukung Range). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; jenis: string; berkasId: string }> },
) {
  try {
    const { id, jenis, berkasId } = await params;
    const { untukKlien } = await assertTurBaca(id);

    if (jenis === "frame") {
      const t = await prisma.titikTur.findFirst({
        where: { id: berkasId, projectId: id },
        select: { framePath: true },
      });
      if (!t?.framePath) throw new HttpError(404, "Frame tidak ditemukan");
      const abs = absAman(t.framePath);
      if (!abs) throw new HttpError(403, "Path tidak diizinkan");
      return await sajikanBerkas(req, abs, "image/png");
    }

    if (jenis === "klip") {
      const k = await prisma.klipTur.findFirst({
        where: { id: berkasId, projectId: id, ...(untukKlien ? { status: "DONE" } : {}) },
        select: { videoPath: true },
      });
      if (!k?.videoPath) throw new HttpError(404, "Video tidak ditemukan");
      const abs = absAman(k.videoPath);
      if (!abs) throw new HttpError(403, "Path tidak diizinkan");
      return await sajikanBerkas(req, abs, "video/mp4");
    }

    throw new HttpError(404, "Jenis berkas tidak dikenal");
  } catch (e) {
    return handleApiError(e);
  }
}
