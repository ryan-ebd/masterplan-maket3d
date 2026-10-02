import { HttpError, handleApiError, jsonOk } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rateLimit";
import { titikTurSchema } from "@/lib/validation";
import { MAKS_TITIK_PER_PROYEK } from "@/lib/video/config";
import { assertTurTulis } from "@/lib/tur/akses";
import { bacaFrame, bacaJsonField, bacaTeks, bacaTeksAda } from "@/lib/tur/form";
import { hapusBerkas, relFrame, tulisBerkas } from "@/lib/tur/storage";

export const runtime = "nodejs";

/** Tambah titik di akhir tur. multipart: frame (PNG 1280x720), nama, deskripsi?, featureId?, pos, target. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, versi } = await assertTurTulis(id);
    assertRateLimit("tur", user.id);

    const form = await req.formData();
    const frame = await bacaFrame(form, true);
    const featureIdMentah = bacaTeks(form, "featureId");
    const data = titikTurSchema.parse({
      nama: bacaTeks(form, "nama"),
      deskripsi: bacaTeksAda(form, "deskripsi"),
      featureId: featureIdMentah !== undefined ? Number(featureIdMentah) : undefined,
      pos: bacaJsonField(form, "pos"),
      target: bacaJsonField(form, "target"),
    });

    const jumlah = await prisma.titikTur.count({ where: { projectId: id } });
    if (jumlah >= MAKS_TITIK_PER_PROYEK) {
      throw new HttpError(409, `Maksimal ${MAKS_TITIK_PER_PROYEK} titik per tur`);
    }
    const akhir = await prisma.titikTur.findFirst({
      where: { projectId: id },
      orderBy: { urutan: "desc" },
      select: { urutan: true },
    });

    const titik = await prisma.titikTur.create({
      data: {
        projectId: id,
        urutan: (akhir?.urutan ?? -1) + 1,
        nama: data.nama,
        deskripsi: data.deskripsi || null,
        featureId: data.featureId ?? null,
        pos: data.pos,
        target: data.target,
        modelVersi: versi,
      },
    });
    try {
      const rel = relFrame(id, titik.id);
      await tulisBerkas(rel, frame!);
      await prisma.titikTur.update({ where: { id: titik.id }, data: { framePath: rel } });
    } catch (e) {
      await hapusBerkas(relFrame(id, titik.id));
      await prisma.titikTur.delete({ where: { id: titik.id } }).catch(() => {});
      throw e;
    }
    return jsonOk({ id: titik.id }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
