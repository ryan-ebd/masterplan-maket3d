import { createReadStream } from "node:fs";
import { mkdir, rename, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import path from "node:path";
import type { Polygon } from "geojson";
import { prisma } from "@/lib/prisma";
import { CACHE_DIR } from "@/lib/storage";
import { hitungBasemap } from "@/lib/basemap";
import { HttpError, assertProjectAccess, handleApiError } from "@/lib/authz";

export const runtime = "nodejs";

const MAPTYPE: Record<string, string> = { satelit: "satellite", peta: "roadmap" };

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const { user, project } = await assertProjectAccess(projectId);

    // Klien hanya boleh melihat basemap setelah maket dipublikasikan
    if (user.role === "KLIEN" && project.status !== "SELESAI") {
      throw new HttpError(403, "Maket belum dipublikasikan");
    }

    const t = new URL(req.url).searchParams.get("t") ?? "";
    const maptype = MAPTYPE[t];
    if (!maptype) throw new HttpError(400, "Parameter t harus 'satelit' atau 'peta'");

    const key = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!key) throw new HttpError(503, "GOOGLE_MAPS_SERVER_KEY belum dikonfigurasi");

    const row = await prisma.project.findUnique({
      where: { id: projectId },
      select: { boundary: true },
    });
    const geo = row?.boundary ? hitungBasemap(row.boundary as unknown as Polygon) : null;
    if (!geo) throw new HttpError(404, "Proyek belum memiliki batas wilayah");

    // Hash centroid+zoom: boundary berubah → file cache baru otomatis.
    const hash = createHash("sha1")
      .update(`${geo.lat0},${geo.lng0},${geo.zoom}`)
      .digest("hex")
      .slice(0, 12);
    const dir = path.join(CACHE_DIR, "basemap", projectId);
    const abs = path.join(dir, `${maptype}-${hash}.png`);

    let st = await stat(abs).catch(() => null);
    if (!st) {
      const u = new URL("https://maps.googleapis.com/maps/api/staticmap");
      u.searchParams.set("center", `${geo.lat0},${geo.lng0}`);
      u.searchParams.set("zoom", String(geo.zoom));
      u.searchParams.set("size", "640x640");
      u.searchParams.set("scale", "2");
      u.searchParams.set("maptype", maptype);
      u.searchParams.set("key", key);

      const res = await fetch(u);
      // Static Maps bisa balas 200 berisi pesan error non-gambar — cek content-type juga.
      if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) {
        throw new HttpError(502, "Gagal mengambil citra dari Google Static Maps");
      }
      const buf = Buffer.from(await res.arrayBuffer());
      await mkdir(dir, { recursive: true });
      const tmp = `${abs}.${process.pid}.tmp`;
      await writeFile(tmp, buf);
      await rename(tmp, abs);
      st = await stat(abs);
    }

    const etag = `"${st.size}-${st.mtimeMs}"`;
    const headers = new Headers({
      "Content-Type": "image/png",
      "Content-Length": String(st.size),
      "Cache-Control": "private, max-age=3600",
      ETag: etag,
    });
    if (req.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers });
    }

    const rs = Readable.toWeb(createReadStream(abs)) as ReadableStream;
    return new Response(rs, { status: 200, headers });
  } catch (e) {
    return handleApiError(e);
  }
}
