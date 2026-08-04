import { checkRateLimit } from "@/lib/rateLimit";
import { enqueueGenerate } from "@/lib/jobs/runner";
import { HttpError, assertProjectAssigned, handleApiError, requireRole } from "@/lib/authz";

const STATUS_BOLEH = new Set(["DIPROSES", "REVIEW_PERENCANA", "GAGAL"]);

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireRole("PERENCANA");
    const { project } = await assertProjectAssigned(id, user);

    if (!project.boundary) {
      throw new HttpError(409, "Batas wilayah belum ditentukan — gambar atau minta usulan LLM dulu");
    }
    if (!STATUS_BOLEH.has(project.status)) {
      throw new HttpError(409, `Generate tidak bisa dijalankan saat status ${project.status}`);
    }
    if (!checkRateLimit(`generate:${user.id}`, 6, 60_000)) {
      throw new HttpError(429, "Terlalu sering — tunggu sebentar sebelum generate lagi");
    }

    const jobId = await enqueueGenerate(id);
    return Response.json({ ok: true, data: { jobId } }, { status: 202 });
  } catch (e) {
    return handleApiError(e);
  }
}
