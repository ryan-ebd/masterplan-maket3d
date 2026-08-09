import { assertRateLimit } from "@/lib/rateLimit";
import { enqueueGenerate } from "@/lib/jobs/runner";
import { HttpError, assertProjectEditable, handleApiError } from "@/lib/authz";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, project } = await assertProjectEditable(id, "Generate");

    if (!project.boundary) {
      throw new HttpError(409, "Batas wilayah belum ditentukan — gambar atau minta usulan LLM dulu");
    }
    assertRateLimit("generate", user.id);

    const jobId = await enqueueGenerate(id);
    return Response.json({ ok: true, data: { jobId } }, { status: 202 });
  } catch (e) {
    return handleApiError(e);
  }
}
