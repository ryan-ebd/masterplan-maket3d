import { prisma } from "@/lib/prisma";
import { HttpError, assertProjectAssigned, handleApiError, jsonOk, requireRole } from "@/lib/authz";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireRole("PERENCANA");
    await assertProjectAssigned(id, user);

    const res = await prisma.project.updateMany({
      where: { id, status: "REVIEW_PERENCANA" },
      data: { status: "SELESAI" },
    });
    if (res.count === 0) {
      throw new HttpError(409, "Publikasi hanya bisa dari status Review Perencana");
    }
    return jsonOk({ id, status: "SELESAI" });
  } catch (e) {
    return handleApiError(e);
  }
}
