import { HttpError } from "@/lib/authz";
import { validasiFramePng } from "./storage";

/** Ambil bidang multipart `frame` (PNG) sebagai Buffer tervalidasi; null bila tidak dikirim. */
export async function bacaFrame(form: FormData, wajib: boolean): Promise<Buffer | null> {
  const f = form.get("frame");
  if (!(f instanceof Blob) || f.size === 0) {
    if (wajib) throw new HttpError(422, "Frame PNG wajib dikirim");
    return null;
  }
  const buf = Buffer.from(await f.arrayBuffer());
  const salah = validasiFramePng(buf);
  if (salah) throw new HttpError(422, salah);
  return buf;
}

/** Bidang multipart bertipe JSON (`pos`, `target`) -> nilai terurai, atau undefined bila kosong. */
export function bacaJsonField(form: FormData, nama: string): unknown {
  const v = form.get(nama);
  if (v == null || v === "") return undefined;
  if (typeof v !== "string") throw new HttpError(422, `Bidang ${nama} tidak valid`);
  try {
    return JSON.parse(v);
  } catch {
    throw new HttpError(422, `Bidang ${nama} bukan JSON`);
  }
}

export function bacaTeks(form: FormData, nama: string): string | undefined {
  const v = form.get(nama);
  return typeof v === "string" && v !== "" ? v : undefined;
}

/** Seperti bacaTeks, tetapi string kosong tetap dikembalikan (artinya "kosongkan bidang ini"). */
export function bacaTeksAda(form: FormData, nama: string): string | undefined {
  const v = form.get(nama);
  return typeof v === "string" ? v : undefined;
}
