// Rate limiter in-memory sederhana (sliding window) — cukup untuk prototype 1 proses.
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
