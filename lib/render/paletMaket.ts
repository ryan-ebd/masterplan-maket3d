// Palet "maket berwarna gaya arsitek". SATU sumber untuk warna di viewer (client) DAN
// nama warna di prompt Seedance (server) — jadi video dan render live tidak saling beda.
// Client-safe: tanpa import node. Naikkan PALET_VERSI bila warna diubah -> klip lama
// otomatis ditandai basi (hash klip memuatnya).

export const PALET_VERSI = 2;

export interface WarnaMaket {
  hex: string;
  /** Nama warna dalam bahasa Inggris untuk prompt. */
  nama: string;
}

export const WARNA_DINDING: WarnaMaket = { hex: "#F2EDE3", nama: "warm cream" };

/** Warna atap per zoneType pipeline (lib/pipeline/config.ts). */
export const WARNA_ATAP: Record<string, WarnaMaket> = {
  perumahan: { hex: "#C8643C", nama: "terracotta" },
  komersial: { hex: "#5B7183", nama: "blue-grey" },
  industri: { hex: "#8C9298", nama: "cool grey" },
  fasum: { hex: "#4F8F7B", nama: "sage green" },
  campuran: { hex: "#8A7AA8", nama: "dusty violet" },
};
export const WARNA_ATAP_DEFAULT: WarnaMaket = { hex: "#C8643C", nama: "terracotta" };

/** Layer/mesh non-bangunan. Kunci = layer pipeline, atau nama mesh bila lebih spesifik. */
export const WARNA_LAYER: Record<string, WarnaMaket> = {
  "jalan-arteri": { hex: "#5F6368", nama: "dark grey" },
  "jalan-kolektor": { hex: "#7A7F85", nama: "mid grey" },
  "jalan-lokal": { hex: "#9AA0A6", nama: "light grey" },
  air: { hex: "#8EC5E6", nama: "light blue" },
  terrain: { hex: "#E4E8D6", nama: "pale sage" },
  papan: { hex: "#DAD0B8", nama: "pale sand" },
  pohon: { hex: "#5E9B54", nama: "leaf green" },
  "pohon-batang": { hex: "#6B4F3A", nama: "brown" },
};

/** Latar solid saat capture & tur live (canvas aslinya transparan, gradien ada di CSS). */
export const LATAR_TUR_HEX = "#F2EDE3";

export function warnaAtap(zoneType: string | undefined): WarnaMaket {
  return (zoneType && WARNA_ATAP[zoneType]) || WARNA_ATAP_DEFAULT;
}

/** Deskripsi palet untuk prompt, dipersempit ke zona yang benar-benar ada di proyek. */
export function deskripsiPaletUntukPrompt(zonaAda: string[]): string {
  const atap = [...new Set(zonaAda.map((z) => warnaAtap(z).nama))];
  const atapTeks = atap.length > 0 ? atap.join(", ") : WARNA_ATAP_DEFAULT.nama;
  return (
    `${WARNA_DINDING.nama} building walls, roofs in ${atapTeks}, ` +
    `grey roads, ${WARNA_LAYER.air.nama} water, ${WARNA_LAYER.terrain.nama} ground, ` +
    `${WARNA_LAYER.pohon.nama} trees on a ${WARNA_LAYER.papan.nama} base`
  );
}
