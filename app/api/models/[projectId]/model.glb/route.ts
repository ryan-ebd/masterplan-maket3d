import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { STORAGE_ROOT } from "@/lib/storage";
import { HttpError, assertProjectAccess, handleApiError } from "@/lib/authz";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const { user, project } = await assertProjectAccess(projectId);

    // Klien hanya boleh melihat model setelah dipublikasikan
    if (user.role === "KLIEN" && project.status !== "SELESAI") {
      throw new HttpError(403, "Maket belum dipublikasikan");
    }

    const model = await prisma.model3D.findUnique({
      where: { projectId },
      select: { glbPath: true }, // stats/layersMeta JSON besar tidak dibutuhkan di sini
    });
    if (!model) throw new HttpError(404, "Model 3D belum tersedia");

    // Anti path-traversal: resolve lalu pastikan tetap di dalam STORAGE_ROOT
    const abs = path.resolve(STORAGE_ROOT, model.glbPath);
    if (!abs.startsWith(STORAGE_ROOT + path.sep)) {
      throw new HttpError(403, "Path tidak diizinkan");
    }

    let st;
    try {
      st = await stat(abs);
    } catch {
      throw new HttpError(404, "File GLB tidak ditemukan di storage");
    }

    const etag = `"${st.size}-${st.mtimeMs}"`;
    const headers = new Headers({
      "Content-Type": "model/gltf-binary",
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
