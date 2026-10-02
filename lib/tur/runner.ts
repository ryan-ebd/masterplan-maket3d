import { readFile } from "node:fs/promises";
import type { TitikTur } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createLimiter, sleep } from "@/lib/util";
import { bacaKonfigSeedance, MAKS_KLIP_PARALEL } from "@/lib/video/config";
import { buatPromptKlip } from "@/lib/video/prompt";
import { ambilTask, buatTask, unduhVideo } from "@/lib/video/seedance";
import { hashRuas, ruasBerurutan } from "./service";
import { absAman, hapusBerkas, keDataUri, relKlip, tulisBerkas } from "./storage";

// Runner klip tur — cermin lib/jobs/runner.ts (fire-and-forget di proses Next, state di
// globalThis agar HMR-safe) dengan dua perbedaan: idempotensi per RUAS (activeKey "dari:ke"),
// dan `arkTaskId` disimpan SEGERA setelah task dibuat supaya restart server melanjutkan
// polling alih-alih membuang kredit yang sudah dibayar.

const g = globalThis as unknown as {
  __klipAktif?: Set<string>;
  __klipLimiter?: ReturnType<typeof createLimiter>;
};
const aktif = g.__klipAktif ?? (g.__klipAktif = new Set());
const limiter = g.__klipLimiter ?? (g.__klipLimiter = createLimiter(MAKS_KLIP_PARALEL));

const INTERVAL_POLL_MS = 10_000;
const BATAS_TUNGGU_MS = 30 * 60_000;

async function zonaDiProyek(projectId: string): Promise<string[]> {
  const m = await prisma.model3D.findUnique({ where: { projectId }, select: { stats: true } });
  const fitur = (m?.stats as { features?: Record<string, { zoneType?: string }> } | null)?.features;
  return [...new Set(Object.values(fitur ?? {}).map((f) => f.zoneType).filter((z): z is string => !!z))];
}

/** Daftarkan satu klip (QUEUED) lalu jalankan di latar. Idempoten per ruas. */
export async function enqueueKlip(
  projectId: string,
  dari: TitikTur,
  ke: TitikTur,
): Promise<{ id: string; baru: boolean }> {
  const konfig = bacaKonfigSeedance();
  const resolusi = konfig.resolusi;
  const hashPose = hashRuas(dari, ke, { model: konfig.model, resolusi, durasiDtk: konfig.durasiDtk });
  const prompt = buatPromptKlip(await zonaDiProyek(projectId));

  // Percobaan gagal sebelumnya untuk ruas ini tidak berguna lagi (tidak ditagih BytePlus).
  await prisma.klipTur.deleteMany({ where: { dariId: dari.id, keId: ke.id, status: "ERROR" } });

  let klip;
  try {
    klip = await prisma.klipTur.create({
      data: {
        projectId,
        dariId: dari.id,
        keId: ke.id,
        model: konfig.model,
        resolution: resolusi,
        durasiDtk: konfig.durasiDtk,
        prompt,
        hashPose,
        activeKey: `${dari.id}:${ke.id}`,
      },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      const sedangAda = await prisma.klipTur.findFirst({
        where: { dariId: dari.id, keId: ke.id, status: { in: ["QUEUED", "RUNNING"] } },
        orderBy: { createdAt: "desc" },
      });
      if (sedangAda) return { id: sedangAda.id, baru: false };
    }
    throw e;
  }
  void jalankanKlip(klip.id); // fire-and-forget — JANGAN di-await
  return { id: klip.id, baru: true };
}

export interface HasilRencanaKlip {
  dibuat: number;
  sudahAda: number;
  dilewati: string[];
  kuotaHabis: boolean;
}

/**
 * Buat klip untuk setiap ruas berurutan yang belum punya klip valid. Ruas dilewati bila
 * frame belum ada / berasal dari versi maket lama (harus diambil ulang di editor).
 */
export async function buatKlipUntukSemuaRuas(
  projectId: string,
  versiKini: string,
  sisaKuota: number,
): Promise<HasilRencanaKlip> {
  const titik = await prisma.titikTur.findMany({ where: { projectId }, orderBy: { urutan: "asc" } });
  const konfig = bacaKonfigSeedance();
  const hasil: HasilRencanaKlip = { dibuat: 0, sudahAda: 0, dilewati: [], kuotaHabis: false };

  for (const [a, b] of ruasBerurutan(titik)) {
    if (!a.framePath || !b.framePath) {
      hasil.dilewati.push(`"${a.nama}" → "${b.nama}": frame belum ada`);
      continue;
    }
    if (a.modelVersi !== versiKini || b.modelVersi !== versiKini) {
      hasil.dilewati.push(`"${a.nama}" → "${b.nama}": frame dari versi maket lama — ambil ulang`);
      continue;
    }
    const hash = hashRuas(a, b, {
      model: konfig.model,
      resolusi: konfig.resolusi,
      durasiDtk: konfig.durasiDtk,
    });
    const ada = await prisma.klipTur.findFirst({
      where: { dariId: a.id, keId: b.id, hashPose: hash, status: { in: ["QUEUED", "RUNNING", "DONE"] } },
      select: { id: true },
    });
    if (ada) {
      hasil.sudahAda++;
      continue;
    }
    if (hasil.dibuat >= sisaKuota) {
      hasil.kuotaHabis = true;
      break;
    }
    await enqueueKlip(projectId, a, b);
    hasil.dibuat++;
  }
  return hasil;
}

function jalankanKlip(klipId: string): Promise<void> {
  if (aktif.has(klipId)) return Promise.resolve();
  aktif.add(klipId);
  return limiter(() => proses(klipId)).finally(() => aktif.delete(klipId));
}

async function proses(klipId: string): Promise<void> {
  try {
    const klip = await prisma.klipTur.findUnique({
      where: { id: klipId },
      include: { dari: true, ke: true },
    });
    if (!klip) return; // titik dihapus -> baris ikut terhapus (cascade)

    await prisma.klipTur.update({
      where: { id: klipId },
      data: { status: "RUNNING", startedAt: klip.startedAt ?? new Date() },
    });

    let taskId = klip.arkTaskId;
    if (!taskId) {
      const absA = klip.dari.framePath && absAman(klip.dari.framePath);
      const absB = klip.ke.framePath && absAman(klip.ke.framePath);
      if (!absA || !absB) throw new Error("Frame titik tidak ditemukan");
      const [fa, fb] = await Promise.all([readFile(absA), readFile(absB)]);
      taskId = await buatTask({
        prompt: klip.prompt,
        frameAwal: keDataUri(fa),
        frameAkhir: keDataUri(fb),
      });
      // Segera simpan: setelah ini kredit sudah terpakai & task hidup 7 hari di BytePlus.
      await prisma.klipTur.update({ where: { id: klipId }, data: { arkTaskId: taskId } });
    }

    const batas = Date.now() + BATAS_TUNGGU_MS;
    for (;;) {
      const t = await ambilTask(taskId);
      if (t.status === "succeeded") {
        const url = t.content?.video_url;
        if (!url) throw new Error("Task selesai tetapi tanpa video_url");
        const video = await unduhVideo(url);
        const rel = relKlip(klip.projectId, klipId);
        await tulisBerkas(rel, video);
        await prisma.klipTur.update({
          where: { id: klipId },
          data: { status: "DONE", videoPath: rel, endedAt: new Date(), activeKey: null, error: null },
        });
        await buangKlipLama(klip.dariId, klip.keId, klipId);
        return;
      }
      if (t.status === "failed" || t.status === "cancelled" || t.status === "expired") {
        throw new Error(`BytePlus ${t.status}: ${t.error?.code ?? ""} ${t.error?.message ?? ""}`.trim());
      }
      if (Date.now() > batas) throw new Error("Batas waktu 30 menit terlampaui menunggu BytePlus");
      await sleep(INTERVAL_POLL_MS);
    }
  } catch (e) {
    console.error(`[tur] klip ${klipId} gagal:`, e);
    await prisma.klipTur
      .update({
        where: { id: klipId },
        data: {
          status: "ERROR",
          error: String((e as Error).message ?? e).slice(0, 500),
          endedAt: new Date(),
          activeKey: null,
        },
      })
      .catch(() => {}); // baris sudah terhapus (titik dihapus) -> abaikan
  }
}

/** Setelah klip baru DONE, versi lama ruas yang sama (basi) dibuang beserta berkasnya. */
async function buangKlipLama(dariId: string, keId: string, kecualiId: string) {
  const lama = await prisma.klipTur.findMany({
    where: { dariId, keId, id: { not: kecualiId }, status: { not: "RUNNING" } },
    select: { id: true, videoPath: true },
  });
  for (const k of lama) await hapusBerkas(k.videoPath);
  if (lama.length > 0) {
    await prisma.klipTur.deleteMany({ where: { id: { in: lama.map((k) => k.id) } } });
  }
}

/**
 * Dipanggil dari instrumentation.ts saat server boot. Klip yang sudah punya arkTaskId
 * dilanjutkan polling-nya; yang belum (proses mati sebelum task dibuat) ditandai ERROR.
 */
export async function pulihkanKlipSaatBoot(): Promise<{ lanjut: number; gagal: number }> {
  const sisa = await prisma.klipTur.findMany({ where: { status: { in: ["QUEUED", "RUNNING"] } } });
  let lanjut = 0;
  let gagal = 0;
  for (const k of sisa) {
    if (k.arkTaskId) {
      void jalankanKlip(k.id);
      lanjut++;
    } else {
      await prisma.klipTur.update({
        where: { id: k.id },
        data: {
          status: "ERROR",
          error: "Server dimulai ulang sebelum task dibuat — buat ulang klip.",
          endedAt: new Date(),
          activeKey: null,
        },
      });
      gagal++;
    }
  }
  return { lanjut, gagal };
}
