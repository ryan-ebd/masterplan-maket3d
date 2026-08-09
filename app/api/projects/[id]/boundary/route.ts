import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { putBoundarySchema } from "@/lib/validation";
import { BOUNDARY_LIMITS, validateBoundaryRing, type LngLat } from "@/lib/geo";
import { HttpError, assertProjectEditable, handleApiError, jsonOk } from "@/lib/authz";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { project } = await assertProjectEditable(id, "Ubah batas");

    const body = putBoundarySchema.parse(await req.json());
    const ring = body.polygon.coordinates[0] as LngLat[];
    const hasil = validateBoundaryRing(ring, {
      ...BOUNDARY_LIMITS.manual,
      center: { lat: project.locationLat, lng: project.locationLng },
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
