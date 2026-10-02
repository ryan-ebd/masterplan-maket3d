// Recovery saat server boot: job yang tertinggal RUNNING/QUEUED dari proses sebelumnya
// tidak akan pernah selesai (promise-nya mati bersama proses) -> tandai ERROR,
// proyek GENERATING -> GAGAL. Tanpa ini UI polling zombie selamanya.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { prisma } = await import("@/lib/prisma");
    const stale = await prisma.processingJob.updateMany({
      where: { status: { in: ["QUEUED", "RUNNING"] } },
      data: {
        status: "ERROR",
        error: "Server dimulai ulang — silakan jalankan generate ulang.",
        endedAt: new Date(),
        activeKey: null, // lepas kunci agar generate berikutnya tidak terblokir
      },
    });
    await prisma.project.updateMany({
      where: { status: "GENERATING" },
      data: { status: "GAGAL" },
    });
    if (stale.count > 0) console.log(`[instrumentation] ${stale.count} job basi ditandai ERROR`);
  } catch (e) {
    // DB belum hidup saat build/boot — jangan gagalkan server
    console.warn("[instrumentation] lewati recovery job:", (e as Error).message);
  }

  // Klip tur Seedance: BERBEDA dari job pipeline — task sudah hidup di BytePlus (dan sudah
  // ditagih) begitu arkTaskId tersimpan, jadi dilanjutkan, bukan dibuang.
  try {
    const { pulihkanKlipSaatBoot } = await import("@/lib/tur/runner");
    const { lanjut, gagal } = await pulihkanKlipSaatBoot();
    if (lanjut + gagal > 0) {
      console.log(`[instrumentation] klip tur: ${lanjut} dilanjutkan, ${gagal} ditandai ERROR`);
    }
  } catch (e) {
    console.warn("[instrumentation] lewati pemulihan klip tur:", (e as Error).message);
  }
}
