import { prisma } from "@/lib/prisma";
import {
  HttpError,
  assertProjectAccess,
  assertProjectAssigned,
  type SessionUser,
} from "@/lib/authz";
import { versiMaket } from "./service";

/**
 * Guard TULIS tur: perencana pemegang proyek, status REVIEW_PERENCANA atau SELESAI,
 * dan maket sudah ada. (assertProjectEditable salah di sini: ia menolak SELESAI, padahal
 * perencana boleh menyempurnakan tur setelah dipublikasikan.)
 */
export async function assertTurTulis(projectId: string) {
  const { user, project } = await assertProjectAssigned(projectId);
  if (project.status !== "REVIEW_PERENCANA" && project.status !== "SELESAI") {
    throw new HttpError(409, `Tur hanya bisa diubah saat REVIEW_PERENCANA atau SELESAI (status: ${project.status})`);
  }
  const versi = await versiMaket(projectId);
  if (!versi) throw new HttpError(409, "Maket 3D belum tersedia");
  return { user, project, versi };
}

/** Guard BACA tur: Klien hanya setelah dipublikasikan (SELESAI), sama seperti model.glb. */
export async function assertTurBaca(projectId: string, user?: SessionUser) {
  const { user: u, project } = await assertProjectAccess(projectId, user);
  const untukKlien = u.role === "KLIEN";
  if (untukKlien && project.status !== "SELESAI") {
    throw new HttpError(403, "Tur belum dipublikasikan");
  }
  return { user: u, project, untukKlien };
}

export const jumlahTitik = (projectId: string) => prisma.titikTur.count({ where: { projectId } });
