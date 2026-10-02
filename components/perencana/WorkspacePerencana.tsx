"use client";

import { useRef, useState } from "react";
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
  Megaphone,
  RefreshCw,
  Ruler,
  Shapes,
  UserRound,
} from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { formatLuasKm2, type LngLat } from "@/lib/geo";
import { STEP_LABELS } from "@/lib/pipeline/config";
import { useStatusJob, type JobInfo } from "@/hooks/useStatusJob";
import { Alert } from "@/components/ui/Alert";
import BadgeStatus from "@/components/ui/BadgeStatus";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LokasiProyek } from "@/components/ui/LokasiProyek";
import PenyediaPeta from "@/components/peta/PenyediaPeta";
import EditorPoligon, { type DraftRing } from "@/components/peta/EditorPoligon";
import PanelLlm from "@/components/llm/PanelLlm";
import Viewer3D from "@/components/viewer/Viewer3D";
import EditorTur from "@/components/perencana/EditorTur";
import type { KameraApi } from "@/components/viewer/KameraBridge";
import { publishProject } from "@/app/perencana/actions";
import type { LayerMeta } from "@/components/viewer/types";

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
  // objek baru per usulan LLM — identitasnya yang memicu editor memuat ulang,
  // termasuk saat koordinatnya identik dengan boundary saat ini
  const [draft, setDraft] = useState<DraftRing | null>(null);
  const [savingBoundary, setSavingBoundary] = useState(false);
  const [mengirimGenerate, setMengirimGenerate] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [errorAksi, setErrorAksi] = useState<string | null>(null);
  // API kamera dari viewer (ambil pose, capture frame) — dipakai editor tur
  const kameraApiRef = useRef<KameraApi | null>(null);
  const [featureTerpilih, setFeatureTerpilih] = useState<number | null>(null);

  const { job: jobKini, mutate } = useStatusJob(project.id, {
    fallbackData: lastJob,
    onSelesai: () => router.refresh(),
  });
  const sedangJalan = jobKini?.status === "QUEUED" || jobKini?.status === "RUNNING";
  const perluCobaLagi = jobKini?.status === "ERROR" || project.status === "GAGAL";

  async function simpanBoundary(r: LngLat[], note?: string) {
    setSavingBoundary(true);
    setErrorAksi(null);
    try {
      await fetcher(`/api/projects/${project.id}/boundary`, {
        method: "PUT",
        body: JSON.stringify({ polygon: { type: "Polygon", coordinates: [r] }, note }),
      });
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
    const ok = window.confirm(
      perluCobaLagi
        ? "Jalankan ulang generate maket 3D untuk proyek ini? Proses sebelumnya akan diganti."
        : "Mulai generate maket 3D untuk proyek ini? Proses ini membutuhkan waktu dan kuota generate.",
    );
    if (!ok) return;

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
              {formatLuasKm2(project.areaM2)}
            </span>
          )}
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <LokasiProyek
              address={project.address}
              lat={project.locationLat}
              lng={project.locationLng}
            />
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

      {pesan && <Alert varian="sukses">{pesan}</Alert>}
      {errorAksi && <Alert>{errorAksi}</Alert>}

      {/* Editor + LLM */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 font-display font-semibold">
            <Shapes size={18} className="text-primary" aria-hidden />
            Batas Wilayah Maket
          </h2>
          <PenyediaPeta>
            <EditorPoligon
              center={{ lat: project.locationLat, lng: project.locationLng }}
              initialRing={(project.boundary?.coordinates[0] as LngLat[] | undefined) ?? null}
              draft={draft}
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
        </Card>

        <PanelLlm
          projectId={project.id}
          onBoundaryDraft={(r) => {
            setDraft({ ring: [...r] as LngLat[] });
            setPesan(
              "Usulan poligon AI dimuat ke editor — geser vertex bila perlu, lalu Simpan Batas.",
            );
          }}
        />
      </div>

      {/* Generate + progress */}
      <Card>
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
              {STEP_LABELS[jobKini.step ?? ""] ?? "Menyiapkan…"}
            </p>
          </div>
        )}
        {jobKini?.status === "ERROR" && (
          <Alert className="mt-4">
            <span className="font-semibold">Gagal: </span>
            {jobKini.error ?? "kesalahan tidak diketahui"}
          </Alert>
        )}
      </Card>

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
            boundary={project.boundary}
            kameraApiRef={kameraApiRef}
            onPilihBangunan={setFeatureTerpilih}
          />
          <EditorTur
            projectId={project.id}
            status={project.status}
            version={model.version}
            layersMeta={model.layersMeta}
            stats={model.stats}
            boundary={project.boundary}
            kameraApiRef={kameraApiRef}
            featureTerpilih={featureTerpilih}
          />
        </div>
      )}
    </div>
  );
}
