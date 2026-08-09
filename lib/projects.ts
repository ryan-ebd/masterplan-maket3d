import { prisma } from "@/lib/prisma";
import { HttpError, assertProjectAssigned, requireRole } from "@/lib/authz";

/** Transisi BARU -> DIPROSES: perencana mengklaim proyek untuk dirinya. */
export async function claimProject(projectId: string) {
  const user = await requireRole("PERENCANA");
  const res = await prisma.project.updateMany({
    where: { id: projectId, status: "BARU" },
    data: { perencanaId: user.id, status: "DIPROSES" },
  });
  if (res.count === 0) {
    throw new HttpError(409, "Proyek tidak berstatus BARU (mungkin sudah diklaim)");
  }
}

/** Transisi REVIEW_PERENCANA -> SELESAI oleh perencana yang menangani proyek. */
export async function publishProject(projectId: string) {
  const user = await requireRole("PERENCANA");
  await assertProjectAssigned(projectId, user);
  const res = await prisma.project.updateMany({
    where: { id: projectId, status: "REVIEW_PERENCANA" },
    data: { status: "SELESAI" },
  });
  if (res.count === 0) {
    throw new HttpError(409, "Publikasi hanya bisa dari status Review Perencana");
  }
}
