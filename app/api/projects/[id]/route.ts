import { prisma } from "@/lib/prisma";
import { assertProjectAccess, handleApiError, jsonOk } from "@/lib/authz";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { project } = await assertProjectAccess(id);

    const [model, lastJob] = await Promise.all([
      prisma.model3D.findUnique({
        where: { projectId: id },
        select: { id: true, layersMeta: true, stats: true, createdAt: true },
      }),
      prisma.processingJob.findFirst({
        where: { projectId: id },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, step: true, progress: true, error: true },
      }),
    ]);

    return jsonOk({ project, model, lastJob });
  } catch (e) {
    return handleApiError(e);
  }
}
