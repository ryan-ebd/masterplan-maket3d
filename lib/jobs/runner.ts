import { readdir, unlink } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import type { Polygon } from "geojson";
import { prisma } from "@/lib/prisma";
import { runPipeline } from "@/lib/pipeline";

export type JobInfo = {
  id: string;
  status: "QUEUED" | "RUNNING" | "DONE" | "ERROR";
  step: string | null;
  progress: number;
  error: string | null;
};

const STORAGE_ROOT = path.resolve(process.env.STORAGE_DIR ?? "./storage/models");

// State runner di globalThis: HMR-safe (pola sama dgn prisma singleton).
const g = globalThis as unknown as { __jobRunnerActive?: Set<string> };
const active = g.__jobRunnerActive ?? (g.__jobRunnerActive = new Set());

/**
 * Idempoten ATOMIK: kolom activeKey (unique) berisi projectId selama job aktif.
 * Dua request bersamaan -> yang kedua kena P2002 dan memakai job yang sudah ada,
 * bukan menjalankan pipeline kedua untuk proyek yang sama.
 */
export async function enqueueGenerate(projectId: string): Promise<string> {
  let job;
  try {
    job = await prisma.processingJob.create({ data: { projectId, activeKey: projectId } });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      const aktif = await prisma.processingJob.findFirst({
        where: { projectId, status: { in: ["QUEUED", "RUNNING"] } },
        orderBy: { createdAt: "desc" },
      });
      if (aktif) return aktif.id;
    }
    throw e;
  }

  await prisma.project.update({ where: { id: projectId }, data: { status: "GENERATING" } });
  void runJob(job.id, projectId); // fire-and-forget — JANGAN di-await
  return job.id;
}

async function runJob(jobId: string, projectId: string) {
  if (active.has(jobId)) return;
  active.add(jobId);
  let glbTertulis: string | null = null;
  try {
    await prisma.processingJob.update({
      where: { id: jobId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    if (!project.boundary) throw new Error("Batas wilayah belum ditentukan");

    const report = async (progress: number, step: string) => {
      await prisma.processingJob.update({
        where: { id: jobId },
        data: { progress: Math.round(progress), step },
      });
    };

    const hasil = await runPipeline(
      {
        projectId,
        boundary: project.boundary as unknown as Polygon,
        zonesMeta: project.zonesMeta as unknown as { name: string; type: string }[] | null,
      },
      report,
    );
    glbTertulis = hasil.glbPath;

    // Sapu semua GLB proyek ini kecuali yang baru: menangani file lama DAN yatim
    // dari job yang gagal/terputus sebelumnya (bukan hanya satu path terakhir).
    const dirProyek = path.resolve(STORAGE_ROOT, projectId);
    const namaBaru = path.basename(hasil.glbPath);
    const isi = await readdir(dirProyek).catch(() => [] as string[]);
    for (const f of isi) {
      if (f !== namaBaru && (f.endsWith(".glb") || f.endsWith(".glb.tmp"))) {
        await unlink(path.join(dirProyek, f)).catch(() => {});
      }
    }

    await prisma.model3D.upsert({
      where: { projectId },
      create: {
        projectId,
        glbPath: hasil.glbPath,
        stats: hasil.stats as Prisma.InputJsonValue,
        layersMeta: hasil.layersMeta as unknown as Prisma.InputJsonValue,
      },
      update: {
        glbPath: hasil.glbPath,
        stats: hasil.stats as Prisma.InputJsonValue,
        layersMeta: hasil.layersMeta as unknown as Prisma.InputJsonValue,
      },
    });
    await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        status: "DONE",
        progress: 100,
        step: "export-glb",
        endedAt: new Date(),
        activeKey: null, // lepas kunci idempotensi
      },
    });
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "REVIEW_PERENCANA" },
    });
  } catch (e) {
    console.error(`[runner] job ${jobId} gagal:`, e);
    // Bersihkan GLB yatim: file sudah ditulis tapi Model3D gagal disimpan
    if (glbTertulis) {
      await unlink(path.resolve(STORAGE_ROOT, glbTertulis)).catch(() => {});
    }
    await prisma.processingJob
      .update({
        where: { id: jobId },
        data: {
          status: "ERROR",
          error: String((e as Error).message ?? e).slice(0, 500),
          endedAt: new Date(),
          activeKey: null,
        },
      })
      .catch(() => {});
    // Hanya turunkan ke GAGAL bila proyek memang masih GENERATING karena job INI
    await prisma.project
      .updateMany({ where: { id: projectId, status: "GENERATING" }, data: { status: "GAGAL" } })
      .catch(() => {});
  } finally {
    active.delete(jobId);
  }
}
