import { deskripsiPaletUntukPrompt } from "@/lib/render/paletMaket";

/**
 * Prompt Seedance untuk satu ruas tur (frame awal -> frame akhir).
 * Sengaja: SATU gerakan kamera, nama titik TIDAK dimasukkan (kata seperti "masjid"
 * memancing model menambah detail yang tidak ada di maket), larangan eksplisit atas
 * bangunan baru/orang/teks. Palet datang dari paletMaket.ts agar sama dengan viewer.
 */
export function buatPromptKlip(zonaAda: string[]): string {
  return [
    "A smooth, slow cinematic drone camera glide over an architectural scale model of a neighborhood,",
    "moving continuously from the first frame to the last frame.",
    "Soft even daylight, miniature model look, clean matte materials.",
    `Colors: ${deskripsiPaletUntukPrompt(zonaAda)}.`,
    "Keep every building's shape, position, size and color exactly as in the images.",
    "Do not add, remove or reshape buildings, roads or trees. No people, no vehicles, no animals.",
    "No text, no subtitles, no logo, no watermark.",
  ].join(" ");
}
