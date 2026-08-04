"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Polygon } from "geojson";
import type { ProjectStatus } from "@prisma/client";
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Hammer,
  Info,
  Loader2,
  MapPin,
  Megaphone,
  RefreshCw,
  Ruler,
  Shapes,
  UserRound,
} from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import type { LngLat } from "@/lib/geo";
import { useStatusJob, type JobInfo } from "@/hooks/useStatusJob";
import BadgeStatus from "@/components/ui/BadgeStatus";
import { Button } from "@/components/ui/Button";
import { formatKoordinat } from "@/components/ui/Eyebrow";
import PenyediaPeta from "@/components/peta/PenyediaPeta";
import EditorPoligon from "@/components/peta/EditorPoligon";
import PanelLlm from "@/components/llm/PanelLlm";
import Viewer3D from "@/components/viewer/Viewer3D";
import { publishProject } from "@/app/perencana/actions";
import type { LayerMeta } from "@/components/viewer/types";

const LABEL_STEP: Record<string, string> = {
  "fetch-osm": "Mengambil data OSM…",
  "fetch-heights": "Menggabungkan tinggi bangunan…",
  "fetch-elevation": "Mengambil elevasi terrain…",
  "build-geometry": "Membangun geometri 3D…",
  "export-glb": "Menulis berkas GLB…",
};

interface ProyekView {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  status: ProjectStatus;
  locationLat: number;
  locationLng: number;
  boundary: Polygon | null;
  boundaryNote: string | null;
  areaM2: number | null;
  klienName: string;
}

interface ModelView {
  id: string;
  version: string;
  layersMeta: LayerMeta[];
  stats: unknown;
}

export default function WorkspacePerencana({
  project,
  model,
  lastJob,
}: {
  project: ProyekView;
  model: ModelView | null;
  lastJob: JobInfo | null;
}) {
  const router = useRouter();
  const [ring, setRing] = useState<LngLat[] | null>(
    (project.boundary?.coordinates[0] as LngLat[] | undefined) ?? null,
  );
  // nonce: draft LLM yang KOORDINATNYA sama dengan ring saat ini tetap harus dimuat ulang
  const [draftNonce, setDraftNonce] = useState(0);
  const [savingBoundary, setSavingBoundary] = useState(false);
  const [mengirimGenerate, setMengirimGenerate] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [errorAksi, setErrorAksi] = useState<string | null>(null);

  const { job, mutate } = useStatusJob(project.id, true);
  const jobKini = job ?? lastJob;
  const sedangJalan = jobKini?.status === "QUEUED" || jobKini?.status === "RUNNING";

  const prevStatus = useRef<string | undefined>(jobKini?.status);
  useEffect(() => {
    if (prevStatus.current !== jobKini?.status) {
      if (jobKini?.status === "DONE" || jobKini?.status === "ERROR") router.refresh();
      prevStatus.current = jobKini?.status;
    }
  }, [jobKini?.status, router]);

  async function simpanBoundary(r: LngLat[], note?: string) {
    setSavingBoundary(true);
    setErrorAksi(null);
    try {
      await fetcher(`/api/projects/${project.id}/boundary`, {
        method: "PUT",
        body: JSON.stringify({ polygon: { type: "Polygon", coordinates: [r] }, note }),
      });
      setRing(r);
      setPesan("Batas wilayah tersimpan.");
      router.refresh();
    } catch (e) {
      setErrorAksi((e as Error).message);
    } finally {
      setSavingBoundary(false);
    }
  }

  async function generate() {
    if (mengirimGenerate) return; // cegah klik ganda sebelum job pertama terdaftar
    setMengirimGenerate(true);
    setErrorAksi(null);
    setPesan(null);
    try {
      await fetcher<{ jobId: string }>(`/api/projects/${project.id}/generate`, { method: "POST" });
      await mutate();
      router.refresh();
    } catch (e) {
      setErrorAksi((e as Error).message);
    } finally {
      setMengirimGenerate(false);
    }
  }

  const perluCobaLagi = jobKini?.status === "ERROR" || project.status === "GAGAL";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/perencana"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors duration-200 hover:text-primary"
        >
          <ArrowLeft size={15} aria-hidden />
          Semua proyek
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold">{project.name}</h1>
          <BadgeStatus status={project.status} />
          {project.areaM2 != null && (
            <span className="inline-flex items-center gap-1.5 rounded border border-line px-2.5 py-1 font-mono text-xs text-primary">
              <Ruler size={12} aria-hidden />
              {(project.areaM2 / 1e6).toFixed(3)} km²
            </span>
          )}
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <MapPin size={14} className="shrink-0 text-primary" aria-hidden />
            {project.address ?? (
              <span className="font-mono text-xs">
                {formatKoordinat(project.locationLat, project.locationLng)}
              </span>
            )}
          </span>
          <span className="flex items-center gap-1.5 text-muted">
            <UserRound size={13} aria-hidden />
            {project.klienName}
          </span>
        </p>
        {project.description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {project.description}
          </p>
        )}
      </div>

      {pesan && (
        <p className="flex items-center gap-2 rounded-md bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          <CheckCircle2 size={16} className="shrink-0" aria-hidden />
          {pesan}
        </p>
      )}
      {errorAksi && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md bg-rose-50 px-4 py-2.5 text-sm text-danger"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          {errorAksi}
        </p>
      )}

      {/* Editor + LLM */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-lg border border-line bg-surface p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-display font-semibold">
            <Shapes size={18} className="text-primary" aria-hidden />
            Batas Wilayah Maket
          </h2>
          <PenyediaPeta>
            <EditorPoligon
              center={{ lat: project.locationLat, lng: project.locationLng }}
              initialRing={ring}
              draftNonce={draftNonce}
              onSave={simpanBoundary}
              saving={savingBoundary}
            />
          </PenyediaPeta>
          {project.boundaryNote && (
            <p className="mt-4 flex items-start gap-2 rounded-md border border-line bg-background p-3.5 text-xs leading-relaxed text-muted">
              <Info size={14} className="mt-0.5 shrink-0 text-primary" aria-hidden />
              <span>
                <span className="font-semibold text-foreground">Catatan: </span>
                {project.boundaryNote}
              </span>
            </p>
          )}
        </div>

        <PanelLlm
          projectId={project.id}
          onBoundaryDraft={(r) => {
            setRing([...r] as LngLat[]);
            setDraftNonce((n) => n + 1);
            setPesan(
              "Usulan poligon AI dimuat ke editor — geser vertex bila perlu, lalu Simpan Batas.",
            );
          }}
        />
      </div>

      {/* Generate + progress */}
      <div className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <Button
            onClick={generate}
            disabled={sedangJalan || mengirimGenerate || !project.boundary}
            className="px-6 py-2.5"
          >
            {sedangJalan || mengirimGenerate ? (
              <>
                <Loader2 size={18} className="animate-spin" aria-hidden />
                Sedang membangun…
              </>
            ) : perluCobaLagi ? (
              <>
                <RefreshCw size={18} aria-hidden />
                Coba Lagi
              </>
            ) : (
              <>
                <Hammer size={18} aria-hidden />
                Generate Maket 3D
              </>
            )}
          </Button>
          {!project.boundary && (
            <span className="flex items-center gap-1.5 text-sm text-amber-700">
              <AlertCircle size={15} aria-hidden />
              Simpan batas wilayah dulu sebelum generate.
            </span>
          )}
        </div>

        {sedangJalan && jobKini && (
          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-line/60">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${jobKini.progress}%` }}
                role="progressbar"
                aria-valuenow={jobKini.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progres pembangunan maket"
              />
            </div>
            <p className="mt-2.5 text-sm text-muted">
              <span className="font-mono font-semibold text-primary">{jobKini.progress}%</span> —{" "}
              {LABEL_STEP[jobKini.step ?? ""] ?? "Menyiapkan…"}
            </p>
          </div>
        )}
        {jobKini?.status === "ERROR" && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-md bg-rose-50 p-3.5 text-sm text-danger"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              <span className="font-semibold">Gagal: </span>
              {jobKini.error ?? "kesalahan tidak diketahui"}
            </span>
          </p>
        )}
      </div>

      {/* Viewer + publish */}
      {model && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Boxes size={19} className="text-primary" aria-hidden />
              Preview Maket 3D
            </h2>
            {project.status === "REVIEW_PERENCANA" && (
              <form action={publishProject.bind(null, project.id)}>
                <button className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-emerald-600 px-5 py-2.5 font-semibold text-white transition-colors duration-200 hover:bg-emerald-700 active:scale-[0.98]">
                  <Megaphone size={17} aria-hidden />
                  Publikasikan ke Klien
                </button>
              </form>
            )}
            {project.status === "SELESAI" && (
              <span className="flex items-center gap-1.5 rounded bg-emerald-50 px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 size={15} aria-hidden />
                Sudah dipublikasikan
              </span>
            )}
          </div>
          <Viewer3D
            projectId={project.id}
            version={model.version}
            layersMeta={model.layersMeta}
            stats={model.stats}
          />
        </div>
      )}
    </div>
  );
}
