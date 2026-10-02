import { mkdir, rename, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { STORAGE_ROOT } from "@/lib/storage";
import { FRAME_LEBAR, FRAME_TINGGI, MAKS_UKURAN_FRAME_BYTE } from "@/lib/video/config";

// Berkas tur di STORAGE_ROOT/<projectId>/tur/. Folder terpisah dari *.glb supaya
// penyapu GLB di lib/jobs/runner.ts tidak menyentuhnya.

export const relFrame = (projectId: string, titikId: string) => `${projectId}/tur/titik-${titikId}.png`;
export const relKlip = (projectId: string, klipId: string) => `${projectId}/tur/klip-${klipId}.mp4`;

/** Path absolut yang DIJAMIN berada di dalam STORAGE_ROOT (anti path-traversal), atau null. */
export function absAman(rel: string): string | null {
  const abs = path.resolve(STORAGE_ROOT, rel);
  return abs.startsWith(STORAGE_ROOT + path.sep) ? abs : null;
}

/** Tulis atomik: .tmp lalu rename (pola 06-export-glb.ts). */
export async function tulisBerkas(rel: string, data: Buffer): Promise<void> {
  const abs = absAman(rel);
  if (!abs) throw new Error("Path tidak diizinkan");
  await mkdir(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, abs);
}

export async function hapusBerkas(rel: string | null | undefined): Promise<void> {
  if (!rel) return;
  const abs = absAman(rel);
  if (abs) await unlink(abs).catch(() => {});
}

const TANDA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Validasi frame unggahan: tanda tangan PNG, ukuran berkas, dan dimensi persis
 * 1280x720 dari chunk IHDR (frame dengan ukuran lain membuat Seedance meregang/melompat).
 * Mengembalikan pesan error, atau null bila valid.
 */
export function validasiFramePng(buf: Buffer): string | null {
  if (buf.length > MAKS_UKURAN_FRAME_BYTE) return "Frame terlalu besar (maks 8 MB)";
  if (buf.length < 33 || !buf.subarray(0, 8).equals(TANDA_PNG)) return "Frame bukan PNG";
  if (buf.toString("ascii", 12, 16) !== "IHDR") return "PNG rusak (IHDR tidak ditemukan)";
  const lebar = buf.readUInt32BE(16);
  const tinggi = buf.readUInt32BE(20);
  if (lebar !== FRAME_LEBAR || tinggi !== FRAME_TINGGI) {
    return `Ukuran frame harus ${FRAME_LEBAR}×${FRAME_TINGGI}, bukan ${lebar}×${tinggi}`;
  }
  return null;
}

export function keDataUri(buf: Buffer): string {
  return `data:image/png;base64,${buf.toString("base64")}`;
}
