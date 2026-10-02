// Tipe bersama tur maket (client + server). Tanpa import node / prisma runtime.

export type Vec3 = [number, number, number];

/** Pose kamera dalam koordinat adegan glTF (meter, Y-up, utara = -z). */
export interface Pose {
  pos: Vec3;
  target: Vec3;
}

export type StatusKlip = "QUEUED" | "RUNNING" | "DONE" | "ERROR";

export interface TitikView {
  id: string;
  urutan: number;
  nama: string;
  deskripsi: string | null;
  featureId: number | null;
  pose: Pose;
  /** true bila frame diam belum ada atau diambil dari versi maket yang lama. */
  frameBasi: boolean;
  adaFrame: boolean;
  /** updatedAt (ms) — cache-buster URL frame, karena URL-nya tetap saat frame diganti. */
  diperbaruiMs: number;
}

export interface KlipView {
  id: string;
  dariId: string;
  keId: string;
  status: StatusKlip;
  error: string | null;
  /** Pose/maket/palet berubah sejak klip dibuat -> perlu dibuat ulang. */
  basi: boolean;
  adaVideo: boolean;
  dibuatMs: number;
  mulaiMs: number | null;
}

export interface KeadaanTur {
  titik: TitikView[];
  klip: KlipView[];
  perkiraan: { biayaKlipUsd: number; model: string; resolusi: string; durasiDtk: number };
}

/** Pesan peringatan bila ruas a->b terlalu jauh untuk diinterpolasi Seedance. */
export type PeringatanRuas = string | null;
