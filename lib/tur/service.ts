import type { KlipTur, TitikTur } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PALET_VERSI } from "@/lib/render/paletMaket";
import { bacaKonfigSeedance, perkiraanBiayaKlip } from "@/lib/video/config";
import { hashKlip } from "./hash";
import type { KeadaanTur, KlipView, Pose, TitikView, Vec3 } from "./types";

export function poseDari(t: Pick<TitikTur, "pos" | "target">): Pose {
  return { pos: t.pos as unknown as Vec3, target: t.target as unknown as Vec3 };
}

/**
 * Penanda versi tampilan maket: Model3D.updatedAt + versi palet. Frame titik menyimpan nilai
 * ini saat diambil; maket di-generate ulang ATAU palet warna diubah -> nilainya beda ->
 * frame (dan klip yang memakainya) dianggap basi.
 */
export async function versiMaket(projectId: string): Promise<string | null> {
  const m = await prisma.model3D.findUnique({ where: { projectId }, select: { updatedAt: true } });
  return m ? `${m.updatedAt.toISOString()}|p${PALET_VERSI}` : null;
}

/** Hash yang SEHARUSNYA dimiliki klip untuk ruas ini sekarang (konfigurasi diambil dari klip/lingkungan). */
export function hashRuas(
  dari: TitikTur,
  ke: TitikTur,
  konfig: { model: string; resolusi: string; durasiDtk: number },
): string {
  return hashKlip(
    { pose: poseDari(dari), modelVersi: dari.modelVersi },
    { pose: poseDari(ke), modelVersi: ke.modelVersi },
    konfig,
  );
}

/** Pasangan berurutan (dari -> ke) menurut kolom `urutan`. */
export function ruasBerurutan(titik: TitikTur[]): [TitikTur, TitikTur][] {
  const ruas: [TitikTur, TitikTur][] = [];
  for (let i = 0; i < titik.length - 1; i++) ruas.push([titik[i], titik[i + 1]]);
  return ruas;
}

/**
 * Satu klip "terbaik" per ruas untuk ditampilkan: yang sedang aktif lebih dulu, sisanya
 * yang terbaru. Klip lama (basi) yang masih ada saat penggantinya dibuat tidak ikut tampil.
 */
function pilihPerRuas(klip: KlipTur[]): KlipTur[] {
  const peta = new Map<string, KlipTur>();
  const aktif = (k: KlipTur) => k.status === "QUEUED" || k.status === "RUNNING";
  for (const k of klip) {
    const kunci = `${k.dariId}:${k.keId}`;
    const cur = peta.get(kunci);
    if (
      !cur ||
      (aktif(k) && !aktif(cur)) ||
      (aktif(k) === aktif(cur) && k.createdAt > cur.createdAt)
    ) {
      peta.set(kunci, k);
    }
  }
  return [...peta.values()];
}

export async function muatKeadaanTur(projectId: string, untukKlien: boolean): Promise<KeadaanTur> {
  const [titikDb, klipDb, versi] = await Promise.all([
    prisma.titikTur.findMany({ where: { projectId }, orderBy: { urutan: "asc" } }),
    prisma.klipTur.findMany({ where: { projectId } }),
    versiMaket(projectId),
  ]);
  const peta = new Map(titikDb.map((t) => [t.id, t]));

  const titik: TitikView[] = titikDb.map((t) => ({
    id: t.id,
    urutan: t.urutan,
    nama: t.nama,
    deskripsi: t.deskripsi,
    featureId: t.featureId,
    pose: poseDari(t),
    adaFrame: !!t.framePath,
    diperbaruiMs: t.updatedAt.getTime(),
    frameBasi: !t.framePath || t.modelVersi !== versi,
  }));

  let klip: KlipView[] = [];
  for (const k of pilihPerRuas(klipDb)) {
    const dari = peta.get(k.dariId);
    const ke = peta.get(k.keId);
    if (!dari || !ke) continue;
    const basi =
      hashRuas(dari, ke, { model: k.model, resolusi: k.resolution, durasiDtk: k.durasiDtk }) !==
      k.hashPose;
    klip.push({
      id: k.id,
      dariId: k.dariId,
      keId: k.keId,
      status: k.status,
      error: untukKlien ? null : k.error,
      basi,
      adaVideo: !!k.videoPath,
      dibuatMs: k.createdAt.getTime(),
      mulaiMs: k.startedAt ? k.startedAt.getTime() : null,
    });
  }
  if (untukKlien) klip = klip.filter((k) => k.status === "DONE" && k.adaVideo && !k.basi);

  const konfig = bacaKonfigSeedance();
  return {
    titik: untukKlien ? titik.filter((t) => t.adaFrame) : titik,
    klip,
    perkiraan: {
      biayaKlipUsd: perkiraanBiayaKlip(konfig),
      model: konfig.model,
      resolusi: konfig.resolusi,
      durasiDtk: konfig.durasiDtk,
    },
  };
}
