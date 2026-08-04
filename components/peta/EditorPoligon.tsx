"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AdvancedMarker, Map, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { AlertTriangle, CheckCheck, Loader2, PenLine, RotateCcw, Ruler, Save, X } from "lucide-react";
import {
  MAX_AREA_M2,
  pathToClosedRing,
  polygonAreaM2,
  ringToPath,
  ringToPolygon,
  type LatLng,
  type LngLat,
} from "@/lib/geo";
import PoligonEditable from "./PoligonEditable";

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

/** Preview garis saat mode gambar (wrapper imperatif kecil google.maps.Polyline). */
function PolylinePreview({ path }: { path: LatLng[] }) {
  const map = useMap();
  const maps = useMapsLibrary("maps");
  const ref = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !maps) return;
    const pl = new maps.Polyline({ strokeColor: "#1e5a46", strokeWeight: 2.5 });
    pl.setMap(map);
    ref.current = pl;
    return () => {
      pl.setMap(null);
      ref.current = null;
    };
  }, [map, maps]);

  useEffect(() => {
    ref.current?.setPath(path);
  }, [path]);

  return null;
}

export default function EditorPoligon({
  center,
  initialRing,
  draftNonce = 0,
  onSave,
  saving,
}: {
  center: LatLng;
  initialRing: LngLat[] | null;
  /** Naik tiap kali ada draft baru dari LLM — memaksa muat ulang walau koordinatnya identik. */
  draftNonce?: number;
  onSave: (ring: LngLat[], note?: string) => Promise<void>;
  saving: boolean;
}) {
  const [path, setPath] = useState<LatLng[]>(initialRing ? ringToPath(initialRing) : []);
  const [mode, setMode] = useState<"lihat" | "gambar">("lihat");
  const [gambar, setGambar] = useState<LatLng[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (initialRing) {
      setPath(ringToPath(initialRing));
      setMode("lihat");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialRing), draftNonce]);

  const luasM2 = useMemo(() => {
    if (path.length < 3) return null;
    try {
      return polygonAreaM2(ringToPolygon(pathToClosedRing(path)));
    } catch {
      return null;
    }
  }, [path]);
  const kebesaran = luasM2 != null && luasM2 > MAX_AREA_M2;

  const tombolSekunder =
    "flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {mode === "lihat" ? (
          <button
            type="button"
            onClick={() => {
              setGambar([]);
              setMode("gambar");
            }}
            className={tombolSekunder}
          >
            <PenLine size={15} aria-hidden />
            Gambar Baru
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={gambar.length < 4}
              onClick={() => {
                setPath(gambar);
                setMode("lihat");
              }}
              className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCheck size={15} aria-hidden />
              Tutup Poligon ({gambar.length} titik)
            </button>
            <button type="button" onClick={() => setMode("lihat")} className={tombolSekunder}>
              <X size={15} aria-hidden />
              Batal
            </button>
          </>
        )}
        <button
          type="button"
          disabled={path.length === 0}
          onClick={() => {
            setPath([]);
            setGambar([]);
          }}
          className={tombolSekunder}
        >
          <RotateCcw size={15} aria-hidden />
          Reset
        </button>
        {luasM2 != null && (
          <span
            className={`ml-auto inline-flex items-center gap-1.5 rounded border px-3 py-1 font-mono text-xs ${
              kebesaran ? "border-rose-200 bg-rose-50 text-danger" : "border-line text-primary"
            }`}
          >
            {kebesaran ? <AlertTriangle size={12} aria-hidden /> : <Ruler size={12} aria-hidden />}
            {(luasM2 / 1e6).toFixed(3)} km²
            {kebesaran && " · melebihi batas 4 km²"}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-line" style={{ height: 440 }}>
        <Map
          mapId={MAP_ID}
          defaultCenter={center}
          defaultZoom={15}
          gestureHandling="greedy"
          onClick={(e) => {
            if (mode === "gambar" && e.detail.latLng) {
              setGambar((g) => [...g, e.detail.latLng!]);
            }
          }}
        >
          <AdvancedMarker position={center} />
          {mode === "lihat" && path.length >= 3 && (
            <PoligonEditable path={path} onChange={setPath} editable={!saving} />
          )}
          {mode === "gambar" && <PolylinePreview path={gambar} />}
        </Map>
      </div>

      {mode === "gambar" && (
        <p className="rounded-md border border-line bg-background px-3.5 py-2.5 text-sm text-muted">
          Klik peta untuk menambah titik batas (minimal 4), lalu tekan “Tutup Poligon”.
        </p>
      )}

      <div className="flex items-center gap-2">
        <label htmlFor="catatan-batas" className="sr-only">
          Catatan batas
        </label>
        <input
          id="catatan-batas"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Catatan batas (opsional)"
          className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-surface px-3.5 text-sm transition-colors duration-200 focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          disabled={saving || path.length < 3 || kebesaran}
          onClick={() => onSave(pathToClosedRing(path), note || undefined)}
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden />
              Menyimpan…
            </>
          ) : (
            <>
              <Save size={16} aria-hidden />
              Simpan Batas
            </>
          )}
        </button>
      </div>
    </div>
  );
}
