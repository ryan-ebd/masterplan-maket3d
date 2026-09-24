// Cache respons mentah Overpass per proyek (storage/cache/, gitignored).
// Kunci = hash boundary -> regenerate dengan batas yang sama tidak fetch ulang OSM
// (hemat fair-use Overpass + demo tidak mati saat mirror sibuk); ubah batas = kunci baru.
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { CACHE_DIR } from "@/lib/storage";

/**
 * Naikkan setiap kali query Overpass di 01-fetch-osm berubah (fitur/tag baru).
 * Cache lama otomatis terlewati tanpa perlu hapus file manual. Riwayat:
 *  v1 (tanpa sufiks) bangunan+jalan+air · v2 +pohon/vegetasi · v3 bangunan per bbox.
 */
export const OSM_QUERY_VERSION = 3;

export function osmCacheKey(projectId: string, boundary: unknown): string {
  const h = createHash("sha1").update(JSON.stringify(boundary)).digest("hex").slice(0, 16);
  return `${projectId}-${h}-osm-v${OSM_QUERY_VERSION}.json`;
}

export async function readOsmCache(key: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(path.join(CACHE_DIR, key), "utf8")) as unknown;
  } catch {
    return null; // tidak ada / korup -> fetch ulang
  }
}

export async function writeOsmCache(key: string, data: unknown): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const abs = path.join(CACHE_DIR, key);
    await writeFile(abs + ".tmp", JSON.stringify(data));
    await rename(abs + ".tmp", abs);
  } catch {
    // cache gagal ditulis bukan alasan menggagalkan pipeline
  }
}
