"use client";

import type { Polygon } from "geojson";
import { Loader2, Route } from "lucide-react";
import { useTur } from "@/hooks/useTur";
import type { LayerMeta } from "@/components/viewer/types";
import TurMaket from "./TurMaket";

/** Tur untuk Klien: dimuat dari API (hanya klip DONE yang valid), tersembunyi bila belum ada titik. */
export default function TurKlien({
  projectId,
  version,
  layersMeta,
  stats,
  boundary,
}: {
  projectId: string;
  version: string;
  layersMeta: LayerMeta[];
  stats?: unknown;
  boundary?: Polygon | null;
}) {
  const { tur, isLoading } = useTur(projectId);

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 size={15} className="animate-spin" aria-hidden />
        Memuat tur…
      </p>
    );
  }
  if (!tur || tur.titik.length === 0) return null;

  return (
    <section aria-labelledby="judul-tur">
      <h2 id="judul-tur" className="mb-1.5 flex items-center gap-2 font-display text-lg font-semibold">
        <Route size={19} className="text-primary" aria-hidden />
        Tur Maket
      </h2>
      <p className="mb-3 max-w-2xl text-sm leading-relaxed text-muted">
        Pilih sebuah titik untuk menonton perjalanan kamera ke sana, lalu putar dan zoom maket
        langsung dari sudut itu.
      </p>
      <TurMaket
        projectId={projectId}
        version={version}
        layersMeta={layersMeta}
        stats={stats}
        boundary={boundary}
        tur={tur}
      />
    </section>
  );
}
