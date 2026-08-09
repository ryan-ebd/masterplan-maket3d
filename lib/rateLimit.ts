// Rate limiter in-memory sederhana (sliding window) — cukup untuk prototype 1 proses.
import { HttpError } from "@/lib/authz";

const g = globalThis as unknown as { __rateBuckets?: Map<string, number[]> };
const buckets = g.__rateBuckets ?? (g.__rateBuckets = new Map<string, number[]>());

/** true jika DIIZINKAN; false jika melebihi `max` panggilan per `windowMs`. */
export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  return true;
}

// Kuota per bucket — `llm` sengaja SATU bucket untuk chat + suggest-boundary.
export const RATE_LIMITS = {
  llm: { max: 10, windowMs: 60_000, pesan: "Terlalu banyak permintaan LLM — tunggu sebentar" },
  generate: {
    max: 6,
    windowMs: 60_000,
    pesan: "Terlalu sering — tunggu sebentar sebelum generate lagi",
  },
} as const;

/** Lempar 429 bila kuota bucket `nama` untuk user ini habis. */
export function assertRateLimit(nama: keyof typeof RATE_LIMITS, userId: string) {
  const c = RATE_LIMITS[nama];
  if (!checkRateLimit(`${nama}:${userId}`, c.max, c.windowMs)) {
    throw new HttpError(429, c.pesan);
  }
}
