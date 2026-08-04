"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import PanelLayer from "./PanelLayer";
import KartuInfoBangunan from "./KartuInfoBangunan";
import type { InfoBangunan, LayerMeta } from "./types";

// three menyentuh window/WebGL — SSR off (legal karena file ini 'use client')
const AdeganMaket = dynamic(() => import("./AdeganMaket"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-background">
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 size={16} className="animate-spin" aria-hidden />
        Memuat viewer 3D…
      </p>
    </div>
  ),
});

interface StatsShape {
  features?: Record<string, InfoBangunan>;
}

export default function Viewer3D({
  projectId,
  version,
  layersMeta,
  stats,
}: {
  projectId: string;
  version: string;
  layersMeta: LayerMeta[];
  stats?: unknown;
}) {
  const [layerAktif, setLayerAktif] = useState<string[]>(
    layersMeta.filter((l) => l.defaultVisible).map((l) => l.id),
  );
  const [info, setInfo] = useState<InfoBangunan | null>(null);

  const url = useMemo(
    () => `/api/models/${projectId}/model.glb?v=${version}`,
    [projectId, version],
  );

  function onPick(featureId: number) {
    setInfo((stats as StatsShape | undefined)?.features?.[String(featureId)] ?? null);
  }

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-line shadow-sm"
      style={{ height: 520 }}
    >
      <AdeganMaket url={url} layerAktif={layerAktif} onPick={onPick} />
      <PanelLayer
        layersMeta={layersMeta}
        aktif={layerAktif}
        onToggle={(id) =>
          setLayerAktif((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]))
        }
      />
      <KartuInfoBangunan info={info} onClose={() => setInfo(null)} />
      <p className="absolute bottom-3 left-3 z-10 rounded border border-line bg-surface/90 px-2.5 py-1 font-mono text-[10px] text-muted">
        © OpenStreetMap contributors · Peta © Google
      </p>
    </div>
  );
}
