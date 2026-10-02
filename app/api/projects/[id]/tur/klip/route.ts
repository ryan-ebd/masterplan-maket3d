import { HttpError, handleApiError } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/rateLimit";
import { bacaKonfigSeedance, MAKS_KLIP_PER_PROYEK, perkiraanBiayaKlip } from "@/lib/video/config";
import { assertTurTulis } from "@/lib/tur/akses";
import { buatKlipUntukSemuaRuas } from "@/lib/tur/runner";

export const runtime = "nodejs";

/**
 * Buat klip Seedance untuk semua ruas yang belum punya klip valid (belum ada / basi).
 * Mengembalikan 202 segera; progres dibaca lewat GET /tur. Memakai kredit BytePlus.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, versi } = await assertTurTulis(id);

    if (!process.env.ARK_API_KEY) {
      throw new HttpError(503, "ARK_API_KEY belum diisi di server — klip tidak bisa dibuat");
    }
    assertRateLimit("klip", user.id);

    const terpakai = await prisma.klipTur.count({ where: { projectId: id, status: { not: "ERROR" } } });
    const hasil = await buatKlipUntukSemuaRuas(id, versi, Math.max(0, MAKS_KLIP_PER_PROYEK - terpakai));
    if (hasil.dibuat === 0 && hasil.kuotaHabis) {
      throw new HttpError(409, `Batas ${MAKS_KLIP_PER_PROYEK} klip per proyek tercapai`);
    }
    return Response.json(
      {
        ok: true,
        data: {
          ...hasil,
          perkiraanBiayaUsd:
            Math.round(hasil.dibuat * perkiraanBiayaKlip(bacaKonfigSeedance()) * 100) / 100,
        },
      },
      { status: 202 },
    );
  } catch (e) {
    return handleApiError(e);
  }
}
