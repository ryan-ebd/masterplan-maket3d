import { prisma } from "@/lib/prisma";
import { JOB_SELECT } from "@/lib/jobs/runner";
import { assertProjectAccess, handleApiError, jsonOk } from "@/lib/authz";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await assertProjectAccess(id);
    const job = await prisma.processingJob.findFirst({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      select: JOB_SELECT,
    });
    return jsonOk(job); // null bila belum pernah generate
  } catch (e) {
    return handleApiError(e);
  }
}
