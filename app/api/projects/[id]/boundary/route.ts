import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { putBoundarySchema } from "@/lib/validation";
import { validateBoundaryRing, type LngLat } from "@/lib/geo";
import { HttpError, assertProjectAssigned, handleApiError, jsonOk, requireRole } from "@/lib/authz";

const STATUS_BOLEH = new Set(["DIPROSES", "REVIEW_PERENCANA", "GAGAL"]);

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireRole("PERENCANA");
    const { project } = await assertProjectAssigned(id, user);

    if (!STATUS_BOLEH.has(project.status)) {
      throw new HttpError(409, `Batas tidak bisa diubah saat status ${project.status}`);
    }

    const body = putBoundarySchema.parse(await req.json());
    const ring = body.polygon.coordinates[0] as LngLat[];
    // Batasan sama dengan jalur LLM: cegah poligon degenerate / jauh dari titik proyek
    const hasil = validateBoundaryRing(ring, {
      minVertices: 4,
      maxVertices: 100,
      minAreaM2: 1000,
      center: { lat: project.locationLat, lng: project.locationLng },
      maxDistanceKm: 5,
    });
    if (!hasil.ok || !hasil.polygon) {
      throw new HttpError(422, `Poligon tidak valid: ${hasil.error}`);
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        boundary: hasil.polygon as unknown as Prisma.InputJsonValue,
        areaM2: hasil.areaM2,
        ...(body.note !== undefined ? { boundaryNote: body.note } : {}),
      },
      select: { id: true, boundary: true, areaM2: true, boundaryNote: true },
    });
    return jsonOk(updated);
  } catch (e) {
    return handleApiError(e);
  }
}
