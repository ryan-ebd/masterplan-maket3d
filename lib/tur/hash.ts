import { createHash } from "node:crypto";
import { PALET_VERSI } from "@/lib/render/paletMaket";
import type { Pose } from "./types";

const bulat = (v: number) => Math.round(v * 100) / 100;
const vec = (v: number[]) => v.map(bulat);

export interface UjungKlip {
  pose: Pose;
  /** Model3D.updatedAt saat frame titik diambil */
  modelVersi: string;
}

/**
 * Sidik jari semua yang membuat sebuah klip valid: pose + versi maket kedua ujung,
 * versi palet, dan konfigurasi Seedance. Berubah -> klip dianggap basi.
 */
export function hashKlip(
  dari: UjungKlip,
  ke: UjungKlip,
  konfig: { model: string; resolusi: string; durasiDtk: number },
): string {
  const isi = JSON.stringify({
    a: [vec(dari.pose.pos), vec(dari.pose.target), dari.modelVersi],
    b: [vec(ke.pose.pos), vec(ke.pose.target), ke.modelVersi],
    p: PALET_VERSI,
    k: [konfig.model, konfig.resolusi, konfig.durasiDtk],
  });
  return createHash("sha1").update(isi).digest("hex");
}
