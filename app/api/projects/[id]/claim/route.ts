import { prisma } from "@/lib/prisma";
import { HttpError, handleApiError, jsonOk, requireRole } from "@/lib/authz";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireRole("PERENCANA");

    const res = await prisma.project.updateMany({
      where: { id, status: "BARU" },
      data: { perencanaId: user.id, status: "DIPROSES" },
    });
    if (res.count === 0) {
      throw new HttpError(409, "Proyek tidak berstatus BARU (mungkin sudah diklaim)");
    }
    return jsonOk({ id, status: "DIPROSES" });
  } catch (e) {
    return handleApiError(e);
  }
}
