"use client";

import { Building2, X } from "lucide-react";
import type { InfoBangunan } from "./types";

const SUMBER: Record<string, string> = {
  osm: "data OSM (tag height)",
  levels: "estimasi jumlah lantai",
  zone: "estimasi zona AI",
  default: "nilai default",
};

export default function KartuInfoBangunan({
  info,
  onClose,
}: {
  info: InfoBangunan | null;
  onClose: () => void;
}) {
  if (!info) return null;
  return (
    <div className="absolute left-3 top-3 z-10 w-60 rounded-lg border border-line bg-surface/95 p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Building2 size={15} className="text-primary" aria-hidden />
          Info Bangunan
        </p>
        <button
          onClick={onClose}
          aria-label="Tutup info bangunan"
          className="flex size-9 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-200 hover:bg-background hover:text-danger"
        >
          <X size={15} aria-hidden />
        </button>
      </div>
      <dl className="mt-2 space-y-1.5 text-sm">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-muted">Tinggi</dt>
          <dd className="font-mono font-semibold tabular-nums text-primary">
            {info.heightM.toFixed(1)} m
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-muted">Sumber</dt>
          <dd className="text-right text-xs">{SUMBER[info.heightSource] ?? info.heightSource}</dd>
        </div>
        {info.osmId != null && info.osmId !== "" && (
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted">OSM</dt>
            <dd className="truncate text-right font-mono text-xs text-muted">
              {String(info.osmId)}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
