"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AdvancedMarker, Map, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import {
  AlertTriangle,
  CheckCheck,
  Loader2,
  PenLine,
  RotateCcw,
  Ruler,
  Save,
  Undo2,
  X,
} from "lucide-react";
import {
  MAX_AREA_M2,
  detectKinks,
  formatKinkError,
  formatLuasKm2,
  pathToClosedRing,
  polygonAreaM2,
  ringToPath,
  ringToPolygon,
  type LatLng,
  type LngLat,
} from "@/lib/geo";
import PoligonEditable from "./PoligonEditable";

/** Draft usulan LLM — objek BARU per usulan; identitasnya memicu muat ulang editor. */
export interface DraftRing {
  ring: LngLat[];
}

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

/** Preview garis saat mode gambar (wrapper imperatif kecil google.maps.Polyline). */
function PolylinePreview({ path, warning = false }: { path: LatLng[]; warning?: boolean }) {
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

  useEffect(() => {
    ref.current?.setOptions({ strokeColor: warning ? "#e11d48" : "#1e5a46" });
  }, [warning]);

  return null;
}

export default function EditorPoligon({
  center,
  initialRing,
  draft = null,
  onSave,
  saving,
}: {
  center: LatLng;
  initialRing: LngLat[] | null;
  draft?: DraftRing | null;
  onSave: (ring: LngLat[], note?: string) => Promise<void>;
  saving: boolean;
}) {
  const [path, setPath] = useState<LatLng[]>(initialRing ? ringToPath(initialRing) : []);
  const [mode, setMode] = useState<"lihat" | "gambar">("lihat");
  const [gambar, setGambar] = useState<LatLng[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (draft) {
      setPath(ringToPath(draft.ring));
      setMode("lihat");
    }
  }, [draft]);

  // Undo titik terakhir sambil menggambar (tombol + tombol Backspace/Delete).
  useEffect(() => {
    if (mode !== "gambar") return;
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        setGambar((g) => g.slice(0, -1));
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mode]);

  // Deteksi self-intersection LIVE saat menggambar (mirror validator server).
  const gambarKinks = useMemo(
    () => (gambar.length >= 3 ? detectKinks(pathToClosedRing(gambar)) : []),
    [gambar],
  );
  const gambarSelfIntersecting = gambarKinks.length > 0;

  const luasM2 = useMemo(() => {
    if (path.length < 3) return null;
    try {
      return polygonAreaM2(ringToPolygon(pathToClosedRing(path)));
    } catch {
      return null;
    }
  }, [path]);
  const kebesaran = luasM2 != null && luasM2 > MAX_AREA_M2;

  // Deteksi self-intersection pada batas final (mode lihat, termasuk setelah digeser).
  const pathKinks = useMemo(
    () => (path.length >= 3 ? detectKinks(pathToClosedRing(path)) : []),
    [path],
  );
  const pathSelfIntersecting = pathKinks.length > 0;

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
              disabled={gambar.length < 4 || gambarSelfIntersecting}
              onClick={() => {
                setPath(gambar);
                setMode("lihat");
              }}
              className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCheck size={15} aria-hidden />
              Tutup Poligon ({gambar.length} titik)
            </button>
            <button
              type="button"
              disabled={gambar.length === 0}
              onClick={() => setGambar((g) => g.slice(0, -1))}
              className={tombolSekunder}
            >
              <Undo2 size={15} aria-hidden />
              Urungkan Titik
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
            {formatLuasKm2(luasM2)}
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
          {mode === "gambar" && <PolylinePreview path={gambar} warning={gambarSelfIntersecting} />}
          {mode === "gambar" &&
            gambarKinks.map(([lng, lat], i) => (
              <AdvancedMarker key={`kink-${i}-${lng}-${lat}`} position={{ lat, lng }}>
                <div className="h-3 w-3 rounded-full border-2 border-white bg-rose-600 shadow" />
              </AdvancedMarker>
            ))}
        </Map>
      </div>

      {mode === "gambar" &&
        (gambarSelfIntersecting ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-danger"
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              Poligon tidak valid: {formatKinkError(gambarKinks)}. Tekan “Urungkan Titik” untuk
              membatalkan titik terakhir, atau lanjutkan mengelilingi kawasan satu arah tanpa
              melompat bolak-balik.
            </span>
          </p>
        ) : (
          <p className="rounded-md border border-line bg-background px-3.5 py-2.5 text-sm text-muted">
            Klik peta untuk menambah titik batas (minimal 4) mengelilingi kawasan satu arah
            (berlawanan jarum jam), lalu tekan “Tutup Poligon”.
          </p>
        ))}

      {mode === "lihat" && pathSelfIntersecting && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-danger"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Poligon tidak valid: {formatKinkError(pathKinks)}. Geser vertex yang menyilang sebelum
            menyimpan.
          </span>
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
          disabled={saving || path.length < 3 || kebesaran || pathSelfIntersecting}
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
