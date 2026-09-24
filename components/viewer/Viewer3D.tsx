"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { Polygon } from "geojson";
import PanelLayer, { LAYER_TERTUTUP_BASEMAP } from "./PanelLayer";
import KartuInfoBangunan from "./KartuInfoBangunan";
import { hitungBasemap } from "@/lib/basemap";
import type { InfoBangunan, LayerMeta, ModeBasemap } from "./types";

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
  boundary,
}: {
  projectId: string;
  version: string;
  layersMeta: LayerMeta[];
  stats?: unknown;
  boundary?: Polygon | null;
}) {
  const [layerAktif, setLayerAktif] = useState<string[]>(
    layersMeta.filter((l) => l.defaultVisible).map((l) => l.id),
  );
  const [basemap, setBasemap] = useState<ModeBasemap>("off");
  const [info, setInfo] = useState<InfoBangunan | null>(null);
  const [basemapStatus, setBasemapStatus] = useState<"loading" | "ready" | "error">("loading");
  const [basemapErrorMsg, setBasemapErrorMsg] = useState<string | null>(null);

  const url = `/api/models/${projectId}/model.glb?v=${version}`;

  const geo = useMemo(() => (boundary ? hitungBasemap(boundary) : null), [boundary]);
  // Papan + terrain disembunyikan saat basemap aktif (lihat LAYER_TERTUTUP_BASEMAP);
  // plane citra di y=-0.01 menggantikan keduanya sebagai alas.
  const layerTampil =
    basemap === "off"
      ? layerAktif
      : layerAktif.filter((l) => !LAYER_TERTUTUP_BASEMAP.includes(l));
  const basemapUrl =
    basemap !== "off" && geo
      ? `/api/models/${projectId}/basemap?t=${basemap}&v=${version}`
      : null;

  // Reset status setiap kali url berubah (ganti mode) — AdeganMaket melapor balik
  // via onBasemapLoaded/onBasemapError begitu fetch tekstur selesai/gagal.
  useEffect(() => {
    setBasemapStatus("loading");
    setBasemapErrorMsg(null);
  }, [basemapUrl]);

  const onBasemapLoaded = useCallback(() => setBasemapStatus("ready"), []);
  const onBasemapError = useCallback((pesan: string) => {
    setBasemapStatus("error");
    setBasemapErrorMsg(pesan);
  }, []);

  function onPick(featureId: number) {
    setInfo((stats as StatsShape | undefined)?.features?.[String(featureId)] ?? null);
  }

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-line shadow-sm"
      style={{ height: 520 }}
    >
      <AdeganMaket
        url={url}
        layerAktif={layerTampil}
        onPick={onPick}
        basemapUrl={basemapUrl}
        basemapSisi={geo?.sisiMeter}
        basemapTinggi={geo?.tinggiMeter}
        onBasemapLoaded={onBasemapLoaded}
        onBasemapError={onBasemapError}
      />
      <PanelLayer
        layersMeta={layersMeta}
        aktif={layerAktif}
        onToggle={(id) =>
          setLayerAktif((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]))
        }
        basemap={basemap}
        onBasemap={setBasemap}
        basemapTersedia={!!geo}
      />
      <KartuInfoBangunan info={info} onClose={() => setInfo(null)} />
      {basemapUrl && basemapStatus === "loading" && (
        <p className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded border border-line bg-surface/90 px-2.5 py-1.5 font-mono text-xs text-muted">
          <Loader2 size={13} className="animate-spin" aria-hidden />
          Memuat citra alas peta…
        </p>
      )}
      {basemapUrl && basemapStatus === "error" && (
        <p
          role="alert"
          className="absolute left-3 top-3 z-10 flex max-w-[70%] items-start gap-1.5 rounded border border-rose-200 bg-rose-50 px-2.5 py-1.5 font-mono text-xs text-danger"
        >
          <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />
          Gagal memuat alas peta{basemapErrorMsg ? `: ${basemapErrorMsg}` : ""}
        </p>
      )}
      <p className="absolute bottom-3 left-3 z-10 rounded border border-line bg-surface/90 px-2.5 py-1 font-mono text-[10px] text-muted">
        © OpenStreetMap contributors · Peta © Google
      </p>
    </div>
  );
}
