import { retry, sleep } from "@/lib/util";
import { OVERPASS_ENDPOINTS, USER_AGENT } from "../config";

/** POST query Overpass QL dengan rotasi endpoint + retry. Lempar error bila semua gagal. */
export async function queryOverpass(q: string): Promise<unknown> {
  let lastErr: unknown = new Error("Overpass tidak terjangkau");
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      return await retry(
        async () => {
          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": USER_AGENT,
            },
            body: "data=" + encodeURIComponent(q),
            signal: AbortSignal.timeout(90_000),
          });
          if (!res.ok) {
            throw new Error(`Overpass ${new URL(url).host} HTTP ${res.status}`);
          }
          const ct = res.headers.get("content-type") ?? "";
          if (!ct.includes("json")) {
            throw new Error(`Overpass ${new URL(url).host} membalas non-JSON (sibuk)`);
          }
          return (await res.json()) as unknown;
        },
        { retries: 2, minDelayMs: 2000, factor: 4 },
      );
    } catch (e) {
      lastErr = e;
      await sleep(1000); // jeda sebelum pindah mirror
    }
  }
  throw new Error(`Server peta OSM sedang sibuk — coba lagi beberapa menit lagi (${String((lastErr as Error).message)})`);
}
