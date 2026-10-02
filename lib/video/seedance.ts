import "server-only";
import { retry } from "@/lib/util";
import { bacaKonfigSeedance } from "./config";

// Klien REST BytePlus ModelArk (Seedance). Tidak ada SDK Node resmi -> fetch biasa.
// Bentuk request/response dari dokumen "Create/Get video generation task" BytePlus;
// belum diuji dengan key sungguhan saat ditulis (lihat smoke test + klip uji murah).

export type StatusTaskArk = "queued" | "running" | "succeeded" | "failed" | "cancelled" | "expired";

export interface TaskArk {
  id: string;
  model?: string;
  status: StatusTaskArk;
  content?: { video_url?: string; last_frame_url?: string };
  error?: { code?: string; message?: string } | null;
}

export class ArkError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function kunci(): string {
  const k = process.env.ARK_API_KEY;
  if (!k) throw new ArkError(0, "ARK_API_KEY belum diisi di .env");
  return k;
}

function headerArk() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${kunci()}` };
}

/** Hanya 429 / 5xx / kegagalan jaringan yang layak diulang; 4xx lain pasti gagal lagi. */
const layakDiulang = (e: unknown) =>
  !(e instanceof ArkError) || e.status === 429 || e.status >= 500 || e.status === 0;

async function bacaJson<T>(res: Response): Promise<T> {
  const teks = await res.text();
  if (!res.ok) {
    let pesan = teks.slice(0, 300);
    try {
      const j = JSON.parse(teks) as { error?: { message?: string; code?: string } };
      if (j.error?.message) pesan = `${j.error.code ?? "error"}: ${j.error.message}`;
    } catch {
      // bukan JSON
    }
    throw new ArkError(res.status, `BytePlus HTTP ${res.status} — ${pesan}`);
  }
  return JSON.parse(teks) as T;
}

export interface InputKlip {
  prompt: string;
  /** data URI `data:image/png;base64,...` */
  frameAwal: string;
  frameAkhir: string;
}

/** Buat task image-to-video first-frame + last-frame. Mengembalikan id task BytePlus. */
export async function buatTask(input: InputKlip): Promise<string> {
  const k = bacaKonfigSeedance();
  const body = {
    model: k.model,
    content: [
      { type: "text", text: input.prompt },
      { type: "image_url", image_url: { url: input.frameAwal }, role: "first_frame" },
      { type: "image_url", image_url: { url: input.frameAkhir }, role: "last_frame" },
    ],
    resolution: k.resolusi,
    // adaptive: keluaran mengikuti rasio frame (16:9). Wajib untuk 2.5, aman untuk 2.0.
    ratio: "adaptive",
    duration: k.durasiDtk,
    generate_audio: false,
    watermark: false,
    // JANGAN kirim camera_fixed / seed: tidak didukung seri 2.x (bisa HTTP 400).
  };
  return retry(
    async () => {
      const res = await fetch(`${k.baseUrl}/contents/generations/tasks`, {
        method: "POST",
        headers: headerArk(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
      const j = await bacaJson<{ id?: string }>(res);
      if (!j.id) throw new ArkError(res.status, "Respons BytePlus tanpa id task");
      return j.id;
    },
    { retries: 2, minDelayMs: 3000, shouldRetry: layakDiulang },
  );
}

export async function ambilTask(id: string): Promise<TaskArk> {
  const k = bacaKonfigSeedance();
  return retry(
    async () => {
      const res = await fetch(`${k.baseUrl}/contents/generations/tasks/${encodeURIComponent(id)}`, {
        headers: headerArk(),
        signal: AbortSignal.timeout(30_000),
      });
      return bacaJson<TaskArk>(res);
    },
    { retries: 3, minDelayMs: 2000, factor: 2, shouldRetry: layakDiulang },
  );
}

/** Unduh MP4 hasil (URL BytePlus hanya berlaku 24 jam -> salin ke storage segera). */
export async function unduhVideo(url: string): Promise<Buffer> {
  return retry(
    async () => {
      const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
      if (!res.ok) throw new ArkError(res.status, `Unduh video gagal (HTTP ${res.status})`);
      return Buffer.from(await res.arrayBuffer());
    },
    { retries: 2, minDelayMs: 2000, shouldRetry: layakDiulang },
  );
}
