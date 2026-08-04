"use client";

import { Layers } from "lucide-react";
import type { LayerMeta } from "./types";

export default function PanelLayer({
  layersMeta,
  aktif,
  onToggle,
}: {
  layersMeta: LayerMeta[];
  aktif: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="absolute right-3 top-3 z-10 rounded-lg border border-line bg-surface/95 p-3.5 shadow-sm">
      <p className="mb-2.5 flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-primary">
        <Layers size={13} aria-hidden />
        Layer
      </p>
      <div className="space-y-1">
        {layersMeta.map((l) => (
          <label
            key={l.id}
            className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-1.5 text-sm transition-colors duration-200 hover:bg-background"
          >
            <input
              type="checkbox"
              checked={aktif.includes(l.id)}
              onChange={() => onToggle(l.id)}
              className="size-4 accent-primary"
            />
            {l.label}
          </label>
        ))}
      </div>
    </div>
  );
}
