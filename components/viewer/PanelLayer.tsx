"use client";

import { Layers, Map as MapIcon } from "lucide-react";
import type { LayerMeta, ModeBasemap } from "./types";

const MODE_BASEMAP: { id: ModeBasemap; label: string }[] = [
  { id: "off", label: "Mati" },
  { id: "satelit", label: "Satelit" },
  { id: "peta", label: "Peta" },
];

export default function PanelLayer({
  layersMeta,
  aktif,
  onToggle,
  basemap = "off",
  onBasemap,
  basemapTersedia = false,
}: {
  layersMeta: LayerMeta[];
  aktif: string[];
  onToggle: (id: string) => void;
  basemap?: ModeBasemap;
  onBasemap?: (m: ModeBasemap) => void;
  basemapTersedia?: boolean;
}) {
  return (
    <div className="absolute right-3 top-3 z-10 rounded-lg border border-line bg-surface/95 p-3.5 shadow-sm">
      <p className="mb-2.5 flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-primary">
        <Layers size={13} aria-hidden />
        Layer
      </p>
      <div className="space-y-1">
        {layersMeta.map((l) => {
          const nonaktif = l.id === "papan" && basemap !== "off";
          return (
            <label
              key={l.id}
              title={nonaktif ? "Nonaktif saat alas peta tampil" : undefined}
              className={`flex min-h-9 items-center gap-2 rounded-md px-1.5 text-sm transition-colors duration-200 ${
                nonaktif
                  ? "cursor-not-allowed opacity-40"
                  : "cursor-pointer hover:bg-background"
              }`}
            >
              <input
                type="checkbox"
                checked={aktif.includes(l.id)}
                disabled={nonaktif}
                onChange={() => onToggle(l.id)}
                className="size-4 accent-primary"
              />
              {l.label}
            </label>
          );
        })}
      </div>
      {basemapTersedia && onBasemap && (
        <>
          <p className="mb-2 mt-3 flex items-center gap-1.5 border-t border-line pt-3 font-mono text-xs font-semibold uppercase tracking-wide text-primary">
            <MapIcon size={13} aria-hidden />
            Alas Peta
          </p>
          <div className="flex gap-1" role="group" aria-label="Alas peta">
            {MODE_BASEMAP.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={basemap === m.id}
                onClick={() => onBasemap(m.id)}
                className={`min-h-9 flex-1 cursor-pointer rounded-md px-2.5 text-sm font-medium transition-colors duration-200 ${
                  basemap === m.id
                    ? "bg-primary text-white"
                    : "border border-line bg-surface hover:border-primary hover:bg-primary/5 hover:text-primary"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
