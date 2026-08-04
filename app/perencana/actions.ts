"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function claimProject(projectId: string) {
  const session = await auth();
  if (!session?.user || session.user.role === "KLIEN") return;
  await prisma.project.updateMany({
    where: { id: projectId, status: "BARU" },
    data: { perencanaId: session.user.id, status: "DIPROSES" },
  });
  revalidatePath("/perencana");
}

export async function publishProject(projectId: string) {
  const session = await auth();
  if (!session?.user || session.user.role === "KLIEN") return;
  await prisma.project.updateMany({
    where: { id: projectId, status: "REVIEW_PERENCANA" },
    data: { status: "SELESAI" },
  });
  revalidatePath(`/perencana/proyek/${projectId}`);
  revalidatePath("/perencana");
}
