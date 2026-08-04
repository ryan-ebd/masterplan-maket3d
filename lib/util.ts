export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface RetryOptions {
  retries?: number; // jumlah percobaan ulang (di luar percobaan pertama)
  minDelayMs?: number;
  factor?: number;
  shouldRetry?: (e: unknown) => boolean;
}

/** Retry sederhana dengan backoff eksponensial — pengganti p-retry (hindari jebakan ESM-only). */
export async function retry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { retries = 2, minDelayMs = 2000, factor = 4, shouldRetry = () => true } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt === retries || !shouldRetry(e)) break;
      await sleep(minDelayMs * Math.pow(factor, attempt));
    }
  }
  throw lastErr;
}

/** Pembatas concurrency sederhana — pengganti p-limit. */
export function createLimiter(concurrency: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  const next = () => {
    active--;
    queue.shift()?.();
  };
  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= concurrency) await new Promise<void>((r) => queue.push(r));
    active++;
    try {
      return await fn();
    } finally {
      next();
    }
  };
}
