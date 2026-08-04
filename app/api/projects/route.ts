import { prisma } from "@/lib/prisma";
import { createProjectSchema } from "@/lib/validation";
import { handleApiError, jsonOk, requireRole, requireUser } from "@/lib/authz";

export async function GET() {
  try {
    const user = await requireUser();
    // Perencana hanya melihat antrean BARU + proyek yang ia tangani (bukan seluruh basis data)
    const where =
      user.role === "KLIEN"
        ? { klienId: user.id }
        : user.role === "PERENCANA"
          ? { OR: [{ status: "BARU" as const }, { perencanaId: user.id }] }
          : {};
    const projects = await prisma.project.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        klien: { select: { name: true } },
        perencana: { select: { name: true } },
        model: { select: { id: true } },
      },
    });
    return jsonOk(projects);
  } catch (e) {
    return handleApiError(e);
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}&language=id`,
      { signal: AbortSignal.timeout(5000) },
    );
    const body = (await res.json()) as {
      status?: string;
      results?: { formatted_address: string }[];
    };
    if (body.status !== "OK") return null;
    return body.results?.[0]?.formatted_address ?? null;
  } catch {
    return null; // reverse-geocode gagal tidak boleh menggagalkan pembuatan proyek
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole("KLIEN");
    const body = createProjectSchema.parse(await req.json());
    const address = await reverseGeocode(body.lat, body.lng);

    const project = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description,
        locationLat: body.lat,
        locationLng: body.lng,
        address,
        klienId: user.id,
      },
    });
    return jsonOk(project, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
