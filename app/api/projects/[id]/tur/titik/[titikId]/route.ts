import { HttpError, handleApiError, jsonOk } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rateLimit";
import { patchTitikTurSchema } from "@/lib/validation";
import { assertTurTulis } from "@/lib/tur/akses";
import { bacaFrame, bacaJsonField, bacaTeks, bacaTeksAda } from "@/lib/tur/form";
import { hapusBerkas, relFrame, tulisBerkas } from "@/lib/tur/storage";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; titikId: string }> };

/**
 * Ubah nama/deskripsi/pose titik (multipart, semua bidang opsional). Mengubah pose
 * WAJIB menyertakan frame baru: frame lama tidak lagi mewakili pose itu.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id, titikId } = await params;
    const { user, versi } = await assertTurTulis(id);
    assertRateLimit("tur", user.id);

    const titik = await prisma.titikTur.findFirst({ where: { id: titikId, projectId: id } });
    if (!titik) throw new HttpError(404, "Titik tidak ditemukan");

    const form = await req.formData();
    const frame = await bacaFrame(form, false);
    const featureIdMentah = bacaTeks(form, "featureId");
    const data = patchTitikTurSchema.parse({
      nama: bacaTeks(form, "nama"),
      deskripsi: bacaTeksAda(form, "deskripsi"),
      featureId: featureIdMentah !== undefined ? Number(featureIdMentah) : undefined,
      pos: bacaJsonField(form, "pos"),
      target: bacaJsonField(form, "target"),
    });
    if ((data.pos || data.target) && !frame) {
      throw new HttpError(422, "Mengubah sudut kamera membutuhkan frame baru");
    }

    if (frame) await tulisBerkas(relFrame(id, titikId), frame);
    await prisma.titikTur.update({
      where: { id: titikId },
      data: {
        ...(frame && { framePath: relFrame(id, titikId), modelVersi: versi }),
        ...(data.nama !== undefined && { nama: data.nama }),
        ...(data.deskripsi !== undefined && { deskripsi: data.deskripsi || null }),
        ...(data.featureId !== undefined && { featureId: data.featureId }),
        ...(data.pos && { pos: data.pos }),
        ...(data.target && { target: data.target }),
      },
    });
    return jsonOk({ id: titikId });
  } catch (e) {
    return handleApiError(e);
  }
}

/** Hapus titik beserta klip yang menyentuhnya (cascade) dan berkasnya; urutan dirapatkan. */
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id, titikId } = await params;
    const { user } = await assertTurTulis(id);
    assertRateLimit("tur", user.id);

    const titik = await prisma.titikTur.findFirst({ where: { id: titikId, projectId: id } });
    if (!titik) throw new HttpError(404, "Titik tidak ditemukan");

    const klip = await prisma.klipTur.findMany({
      where: { OR: [{ dariId: titikId }, { keId: titikId }] },
      select: { videoPath: true },
    });
    await prisma.titikTur.delete({ where: { id: titikId } }); // klip ikut terhapus (cascade)
    await hapusBerkas(titik.framePath);
    for (const k of klip) await hapusBerkas(k.videoPath);

    const sisa = await prisma.titikTur.findMany({
      where: { projectId: id },
      orderBy: { urutan: "asc" },
      select: { id: true },
    });
    await prisma.$transaction(
      sisa.map((t, i) => prisma.titikTur.update({ where: { id: t.id }, data: { urutan: i } })),
    );
    return jsonOk({ id: titikId });
  } catch (e) {
    return handleApiError(e);
  }
}
