import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Riwayat blok percakapan LlmSession proyek ([] bila belum ada sesi). */
export async function bacaRiwayatLlm(projectId: string): Promise<unknown[]> {
  const sesi = await prisma.llmSession.findUnique({ where: { projectId } });
  return (sesi?.messages as unknown[] | null) ?? [];
}

/**
 * Append blok baru ke LlmSession + (opsional) update proyek dalam SATU transaksi —
 * boundary draft dan riwayat yang menghasilkannya tersimpan atau gagal bersama.
 */
export async function simpanHasilLlm(
  projectId: string,
  riwayatLama: unknown[],
  blokBaru: unknown[],
  projectData?: Prisma.ProjectUpdateInput,
) {
  const gabungan = [...riwayatLama, ...blokBaru] as Prisma.InputJsonValue;
  await prisma.$transaction([
    ...(projectData
      ? [prisma.project.update({ where: { id: projectId }, data: projectData })]
      : []),
    prisma.llmSession.upsert({
      where: { projectId },
      create: { projectId, messages: gabungan },
      update: { messages: gabungan },
    }),
  ]);
}
