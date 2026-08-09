import Link from "next/link";
import type { Polygon } from "geojson";
import { notFound } from "next/navigation";
import { ArrowLeft, Boxes, Info } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import BadgeStatus from "@/components/ui/BadgeStatus";
import { GarisKontur } from "@/components/ui/GarisKontur";
import { LokasiProyek } from "@/components/ui/LokasiProyek";
import Viewer3D from "@/components/viewer/Viewer3D";
import type { LayerMeta } from "@/components/viewer/types";

const LANGKAH = [
  { status: "BARU", label: "Dibuat" },
  { status: "DIPROSES", label: "Diproses Perencana" },
  { status: "GENERATING", label: "Membangun Maket" },
  { status: "REVIEW_PERENCANA", label: "Review Perencana" },
  { status: "SELESAI", label: "Selesai" },
];

export default async function DetailProyekKlien({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const project = await prisma.project.findFirst({
    where: { id, klienId: session!.user.id },
    include: { perencana: { select: { name: true } }, model: true },
  });
  if (!project) notFound();

  const idxKini = Math.max(
    0,
    LANGKAH.findIndex((l) => l.status === project.status),
  );
  const gagal = project.status === "GAGAL";

  return (
    <div className="space-y-7">
      <div>
        <Link
          href="/klien"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors duration-200 hover:text-primary"
        >
          <ArrowLeft size={15} aria-hidden />
          Semua proyek
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold">{project.name}</h1>
          <BadgeStatus status={project.status} />
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
          <LokasiProyek
            address={project.address}
            lat={project.locationLat}
            lng={project.locationLng}
          />
          {project.perencana && (
            <span className="text-muted">· Perencana: {project.perencana.name}</span>
          )}
        </p>
        {project.description && (
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">{project.description}</p>
        )}
      </div>

      {/* Timeline status */}
      <ol className="flex flex-wrap items-center gap-2 text-xs">
        {LANGKAH.map((l, i) => (
          <li key={l.status} className="flex items-center gap-2">
            <span
              className={`rounded px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wide transition-colors duration-200 ${
                gagal && i === 2
                  ? "bg-rose-100 text-danger"
                  : i <= idxKini
                    ? "bg-primary text-white"
                    : "border border-line bg-surface text-muted"
              }`}
            >
              {l.label}
            </span>
            {i < LANGKAH.length - 1 && <span className="h-px w-4 bg-line" aria-hidden />}
          </li>
        ))}
      </ol>

      {project.status === "SELESAI" && project.model ? (
        <div>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
            <Boxes size={19} className="text-primary" aria-hidden />
            Maket 3D
          </h2>
          <Viewer3D
            projectId={project.id}
            version={project.model.updatedAt.toISOString()}
            layersMeta={project.model.layersMeta as unknown as LayerMeta[]}
            stats={project.model.stats}
            boundary={project.boundary as unknown as Polygon | null}
          />
          {project.boundaryNote && (
            <p className="mt-4 flex items-start gap-2 rounded-md border border-line bg-surface p-4 text-sm leading-relaxed text-muted">
              <Info size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
              <span>
                <span className="font-semibold text-foreground">Catatan perencana: </span>
                {project.boundaryNote}
              </span>
            </p>
          )}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-lg border border-dashed border-line bg-surface p-12 text-center">
          <GarisKontur className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 text-line" />
          <div className="relative">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-md bg-primary text-white">
              <Boxes size={24} aria-hidden />
            </div>
            <p className="font-display text-lg font-semibold">
              {gagal ? "Sedang ditangani perencana" : "Maket sedang dikerjakan"}
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted">
              {gagal
                ? "Pembangunan maket sempat gagal — perencana sedang menanganinya."
                : "Anda akan bisa melihat maket 3D di sini setelah perencana mempublikasikannya."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
