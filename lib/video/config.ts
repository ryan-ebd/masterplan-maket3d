// Konfigurasi Seedance (BytePlus ModelArk). Murni konstanta + pembaca env — tanpa I/O,
// sehingga aman diimpor dari route server maupun skrip. Nilai harga dari dokumen resmi
// BytePlus (halaman pricing ModelArk); hanya PERKIRAAN untuk estimasi di UI.

export const ARK_BASE_URL_DEFAULT = "https://ark.ap-southeast.bytepluses.com/api/v3";
export const SEEDANCE_MODEL_DEFAULT = "dreamina-seedance-2-0-260128";

/** Frame acuan = ukuran keluaran 720p 16:9 (dokumen BytePlus: ukuran beda -> peregangan/lompatan). */
export const FRAME_LEBAR = 1280;
export const FRAME_TINGGI = 720;

/** Batas biaya/kapasitas. */
export const MAKS_TITIK_PER_PROYEK = 8;
export const MAKS_KLIP_PER_PROYEK = 30;
export const MAKS_KLIP_PARALEL = 2; // akun individu BytePlus: 3 task bersamaan
export const MAKS_UKURAN_FRAME_BYTE = 8 * 1024 * 1024;

export interface KonfigSeedance {
  baseUrl: string;
  model: string;
  resolusi: "480p" | "720p" | "1080p";
  durasiDtk: number;
}

const RESOLUSI_VALID = ["480p", "720p", "1080p"] as const;

export function bacaKonfigSeedance(): KonfigSeedance {
  const resolusiEnv = process.env.SEEDANCE_RESOLUTION as KonfigSeedance["resolusi"] | undefined;
  const durasi = Number(process.env.SEEDANCE_DURASI_DTK ?? 5);
  return {
    baseUrl: (process.env.ARK_BASE_URL || ARK_BASE_URL_DEFAULT).replace(/\/+$/, ""),
    model: process.env.SEEDANCE_MODEL || SEEDANCE_MODEL_DEFAULT,
    resolusi: resolusiEnv && RESOLUSI_VALID.includes(resolusiEnv) ? resolusiEnv : "720p",
    durasiDtk: Number.isFinite(durasi) ? Math.min(12, Math.max(3, Math.round(durasi))) : 5,
  };
}

// USD per klip 5 detik 16:9 tanpa video input (dokumen BytePlus). Model tak dikenal -> tarif 2.0.
const HARGA_5DTK: Record<string, Partial<Record<KonfigSeedance["resolusi"], number>>> = {
  "dreamina-seedance-2-0-260128": { "480p": 0.35, "720p": 0.76, "1080p": 1.87 },
  "dreamina-seedance-2-0-fast-260128": { "480p": 0.28, "720p": 0.6 },
  "dreamina-seedance-2-0-mini-260615": { "480p": 0.18, "720p": 0.38 },
  "dreamina-seedance-2-5-260628": { "480p": 0.51, "720p": 1.16, "1080p": 2.84 },
};

/** Perkiraan biaya (USD) satu klip dengan konfigurasi ini; skala linear terhadap durasi. */
export function perkiraanBiayaKlip(k: Pick<KonfigSeedance, "model" | "resolusi" | "durasiDtk">) {
  const tabel = HARGA_5DTK[k.model] ?? HARGA_5DTK[SEEDANCE_MODEL_DEFAULT];
  const per5 = tabel[k.resolusi] ?? tabel["720p"] ?? 0.76;
  return Math.round(per5 * (k.durasiDtk / 5) * 100) / 100;
}
