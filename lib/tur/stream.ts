import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { HttpError } from "@/lib/authz";

/**
 * Sajikan berkas dari disk dengan ETag dan dukungan Range (206). Range wajib untuk
 * <video> di Safari dan untuk seek di semua browser (route model.glb belum membutuhkannya).
 */
export async function sajikanBerkas(req: Request, abs: string, contentType: string): Promise<Response> {
  let st;
  try {
    st = await stat(abs);
  } catch {
    throw new HttpError(404, "Berkas tidak ditemukan di storage");
  }
  const size = st.size;
  const etag = `"${size}-${st.mtimeMs}"`;
  const dasar: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    ETag: etag,
  };

  const range = req.headers.get("range");
  if (!range) {
    if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: dasar });
    const rs = Readable.toWeb(createReadStream(abs)) as ReadableStream;
    return new Response(rs, { status: 200, headers: { ...dasar, "Content-Length": String(size) } });
  }

  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  let start = 0;
  let end = size - 1;
  if (m && (m[1] !== "" || m[2] !== "")) {
    if (m[1] === "") {
      start = Math.max(0, size - parseInt(m[2], 10)); // suffix: N byte terakhir
    } else {
      start = parseInt(m[1], 10);
      if (m[2] !== "") end = Math.min(end, parseInt(m[2], 10));
    }
  } else {
    return new Response(null, { status: 416, headers: { ...dasar, "Content-Range": `bytes */${size}` } });
  }
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { ...dasar, "Content-Range": `bytes */${size}` } });
  }
  const rs = Readable.toWeb(createReadStream(abs, { start, end })) as ReadableStream;
  return new Response(rs, {
    status: 206,
    headers: {
      ...dasar,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
    },
  });
}
