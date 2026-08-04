import { notFound } from "next/navigation";
import type { Polygon } from "geojson";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import WorkspacePerencana from "@/components/perencana/WorkspacePerencana";
import type { LayerMeta } from "@/components/viewer/types";
import type { JobInfo } from "@/hooks/useStatusJob";

export default async function HalamanWorkspace({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  // Workspace hanya untuk perencana yang menangani proyek ini (cegah IDOR lintas-perencana)
  const project = await prisma.project.findFirst({
    where: { id, perencanaId: session!.user.id },
    include: {
      model: { select: { id: true, layersMeta: true, stats: true, updatedAt: true } },
      jobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, step: true, progress: true, error: true },
      },
      klien: { select: { name: true } },
    },
  });
  if (!project) notFound();

  return (
    <WorkspacePerencana
      project={{
        id: project.id,
        name: project.name,
        description: project.description,
        address: project.address,
        status: project.status,
        locationLat: project.locationLat,
        locationLng: project.locationLng,
        boundary: project.boundary as unknown as Polygon | null,
        boundaryNote: project.boundaryNote,
        areaM2: project.areaM2,
        klienName: project.klien.name,
      }}
      model={
        project.model
          ? {
              id: project.model.id,
              version: project.model.updatedAt.toISOString(),
              layersMeta: project.model.layersMeta as unknown as LayerMeta[],
              stats: project.model.stats,
            }
          : null
      }
      lastJob={(project.jobs[0] as JobInfo | undefined) ?? null}
    />
  );
}
