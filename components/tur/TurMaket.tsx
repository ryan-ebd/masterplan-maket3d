"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Polygon } from "geojson";
import { ChevronLeft, ChevronRight, Loader2, MapPin, Play, SkipForward, Square } from "lucide-react";
import { hitungBasemap } from "@/lib/basemap";
import { sama } from "@/lib/tur/saran";
import { urlKlip } from "@/lib/tur/klien";
import type { KeadaanTur, Pose } from "@/lib/tur/types";
import type { KameraApi } from "@/components/viewer/KameraBridge";
import KartuInfoBangunan from "@/components/viewer/KartuInfoBangunan";
import type { FiturZona } from "@/components/viewer/ModelMaket";
import type { InfoBangunan, LayerMeta } from "@/components/viewer/types";

// three menyentuh window/WebGL — SSR off
const AdeganMaket = dynamic(() => import("@/components/viewer/AdeganMaket"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-background">
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 size={16} className="animate-spin" aria-hidden />
        Memuat tur 3D…
      </p>
    </div>
  ),
});

type Fitur = Record<string, (InfoBangunan & { zoneType?: string }) | undefined>;

const tidur = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const frameBerikut = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/**
 * Tur interaktif: kanvas 3D live (bawah) + <video> klip Seedance (atas), stage 16:9 dengan
 * FOV/latar/palet yang SAMA dengan frame yang di-capture editor. Karena frame akhir klip
 * adalah render dari pose tujuan, saat video selesai kanvas live sudah berada di pose itu
 * dan video tinggal di-fade-out — pengunjung langsung bisa memutar/zoom maket dari titik tsb.
 * Tanpa klip (belum dibuat/gagal/basi) transisi memakai kamera live yang terbang (gratis).
 */
export default function TurMaket({
  projectId,
  version,
  layersMeta,
  stats,
  boundary,
  tur,
}: {
  projectId: string;
  version: string;
  layersMeta: LayerMeta[];
  stats?: unknown;
  boundary?: Polygon | null;
  tur: KeadaanTur;
}) {
  const titik = useMemo(() => tur.titik.filter((t) => t.adaFrame), [tur.titik]);
  const klipRuas = useMemo(() => {
    const m = new Map<string, string>();
    for (const k of tur.klip) {
      if (k.status === "DONE" && k.adaVideo && !k.basi) m.set(`${k.dariId}:${k.keId}`, k.id);
    }
    return m;
  }, [tur.klip]);

  const layerAktif = useMemo(
    () => layersMeta.filter((l) => l.defaultVisible).map((l) => l.id),
    [layersMeta],
  );
  const geo = useMemo(() => (boundary ? hitungBasemap(boundary) : null), [boundary]);
  const fitur = (stats as { features?: Fitur } | undefined)?.features;

  const [poseAwal] = useState<Pose | undefined>(() => titik[0]?.pose);
  const [indeks, setIndeks] = useState(0);
  const [sibuk, setSibuk] = useState(false);
  const [putarSemua, setPutarSemua] = useState(false);
  const [srcVideo, setSrcVideo] = useState<string | null>(null);
  const [videoTampil, setVideoTampil] = useState(false);
  const [info, setInfo] = useState<InfoBangunan | null>(null);
  // API kamera baru tersedia setelah kanvas (dimuat dinamis) terpasang; kontrol dikunci sampai saat itu
  const [siap, setSiap] = useState(false);

  const kameraRef = useRef<KameraApi | null>(null);
  const selesaiVideoRef = useRef<(() => void) | null>(null);
  const videoGagalRef = useRef(false);
  const batalRef = useRef(false);
  const indeksRef = useRef(0);
  const titikRef = useRef(titik);
  titikRef.current = titik;
  const klipRef = useRef(klipRuas);
  klipRef.current = klipRuas;

  useEffect(() => {
    if (siap) return;
    const t = setInterval(() => {
      if (kameraRef.current) setSiap(true);
    }, 100);
    return () => clearInterval(t);
  }, [siap]);

  useEffect(() => {
    batalRef.current = false;
    return () => {
      batalRef.current = true;
      selesaiVideoRef.current?.();
    };
  }, []);

  // Daftar titik berubah (mis. pratinjau di editor): jaga indeks tetap valid.
  const idx = Math.min(indeks, Math.max(0, titik.length - 1));
  useEffect(() => {
    if (indeks !== idx) {
      indeksRef.current = idx;
      setIndeks(idx);
    }
  }, [indeks, idx]);

  const mainkanKlip = useCallback(async (src: string, tujuan: Pose) => {
    videoGagalRef.current = false;
    await new Promise<void>((resolve) => {
      selesaiVideoRef.current = resolve;
      setSrcVideo(src);
      setVideoTampil(true);
    });
    selesaiVideoRef.current = null;
    const kamera = kameraRef.current;
    if (videoGagalRef.current) {
      // Video tak bisa diputar -> turun ke kamera live, tur tetap berjalan
      setVideoTampil(false);
      setSrcVideo(null);
      await kamera?.terbangKe(tujuan, 1200);
      return;
    }
    // Pindahkan kanvas ke pose tujuan SELAGI video masih menutupinya, tunggu ia tergambar,
    // baru fade-out video -> serah-terima tanpa lompatan.
    kamera?.setPose(tujuan);
    await frameBerikut();
    await frameBerikut();
    setVideoTampil(false);
    await tidur(300);
    setSrcVideo(null);
  }, []);

  const pergiKe = useCallback(
    async (tujuanIdx: number) => {
      const daftar = titikRef.current;
      const dari = daftar[indeksRef.current];
      const ke = daftar[tujuanIdx];
      const kamera = kameraRef.current;
      if (!dari || !ke || !kamera || tujuanIdx === indeksRef.current) return;
      setSibuk(true);
      setInfo(null);
      try {
        const klipId =
          tujuanIdx === indeksRef.current + 1 ? klipRef.current.get(`${dari.id}:${ke.id}`) : undefined;
        if (klipId) {
          // Klip dimulai dari frame di pose titik asal: bila pengunjung sempat memutar maket,
          // kembalikan dulu kamera ke pose itu.
          const kini = kamera.ambilPose();
          if (!sama(kini.pos, dari.pose.pos, 0.5) || !sama(kini.target, dari.pose.target, 0.5)) {
            await kamera.terbangKe(dari.pose, 600);
          }
          await mainkanKlip(urlKlip(projectId, klipId), ke.pose);
        } else {
          await kamera.terbangKe(ke.pose, 1500);
        }
        indeksRef.current = tujuanIdx;
        setIndeks(tujuanIdx);
      } finally {
        setSibuk(false);
      }
    },
    [projectId, mainkanKlip],
  );

  /** Lewati video yang sedang main (tetap berakhir di titik tujuan). Tidak membatalkan "Putar semua". */
  const lewati = useCallback(() => {
    selesaiVideoRef.current?.();
  }, []);

  /** Hentikan "Putar semua" dan lewati video yang sedang main. */
  const berhenti = useCallback(() => {
    batalRef.current = true;
    lewati();
  }, [lewati]);

  async function mulaiPutarSemua() {
    if (!siap || sibuk || titik.length < 2) return;
    batalRef.current = false;
    setPutarSemua(true);
    try {
      if (indeksRef.current >= titik.length - 1) await pergiKe(0);
      while (!batalRef.current && indeksRef.current < titik.length - 1) {
        await pergiKe(indeksRef.current + 1);
        for (let t = 0; t < 1500 && !batalRef.current; t += 100) await tidur(100); // jeda baca
      }
    } finally {
      batalRef.current = false;
      setPutarSemua(false);
    }
  }

  if (titik.length === 0) return null;
  const sekarang = titik[idx];
  const bangunanTerkait = sekarang.featureId != null ? fitur?.[String(sekarang.featureId)] : undefined;

  return (
    <div className="space-y-3">
      <div
        className="relative aspect-video w-full overflow-hidden rounded-lg border border-line bg-background shadow-sm"
        onPointerDown={() => {
          if (putarSemua) berhenti(); // pengunjung mengambil alih
        }}
      >
        <AdeganMaket
          url={`/api/models/${projectId}/model.glb?v=${version}`}
          layerAktif={layerAktif}
          onPick={(id) => setInfo(fitur?.[String(id)] ?? null)}
          modeWarna
          fitur={fitur as FiturZona | undefined}
          kameraApiRef={kameraRef}
          latarSolid
          poseAwal={poseAwal}
          jarakMaks={geo ? Math.max(1500, geo.sisiMeter * 2) : 1500}
        />

        {srcVideo && (
          <video
            key={srcVideo}
            src={srcVideo}
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={() => selesaiVideoRef.current?.()}
            onError={() => {
              videoGagalRef.current = true;
              selesaiVideoRef.current?.();
            }}
            className={`pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-300 ${
              videoTampil ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        <KartuInfoBangunan info={info} onClose={() => setInfo(null)} />

        {!sibuk && (
          <div className="absolute bottom-3 left-3 z-10 max-w-[min(26rem,75%)] rounded-lg border border-line bg-surface/95 p-3.5 shadow-sm">
            <p className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-primary">
              <MapPin size={12} aria-hidden />
              Titik {idx + 1} dari {titik.length}
            </p>
            <p className="mt-1 font-display text-base font-semibold leading-snug">{sekarang.nama}</p>
            {sekarang.deskripsi && (
              <p className="mt-1 text-sm leading-relaxed text-muted">{sekarang.deskripsi}</p>
            )}
            {bangunanTerkait?.heightM != null && (
              <p className="mt-1.5 font-mono text-xs text-muted">
                Tinggi bangunan ≈ {bangunanTerkait.heightM.toFixed(1)} m
              </p>
            )}
            <p className="mt-2 text-xs text-muted">Seret untuk memutar · scroll untuk zoom</p>
          </div>
        )}

        {srcVideo && videoTampil && (
          <button
            type="button"
            onClick={lewati}
            className="absolute bottom-3 right-3 z-10 inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-line bg-surface/95 px-3 text-sm font-medium transition-colors duration-200 hover:border-primary hover:text-primary"
          >
            <SkipForward size={14} aria-hidden />
            Lewati
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void pergiKe(idx - 1)}
          disabled={!siap || sibuk || idx === 0}
          aria-label="Titik sebelumnya"
          className="inline-flex size-10 cursor-pointer items-center justify-center rounded-md border border-line bg-surface transition-colors duration-200 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={18} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => void pergiKe(idx + 1)}
          disabled={!siap || sibuk || idx >= titik.length - 1}
          aria-label="Titik berikutnya"
          className="inline-flex size-10 cursor-pointer items-center justify-center rounded-md border border-line bg-surface transition-colors duration-200 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={18} aria-hidden />
        </button>
        {titik.length > 1 &&
          (putarSemua ? (
            <button
              type="button"
              onClick={berhenti}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-dark"
            >
              <Square size={14} aria-hidden />
              Berhenti
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void mulaiPutarSemua()}
              disabled={!siap || sibuk}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Play size={14} aria-hidden />
              Putar semua
            </button>
          ))}
        {sibuk && (
          <span className="flex items-center gap-1.5 text-sm text-muted">
            <Loader2 size={14} className="animate-spin" aria-hidden />
            Menuju titik…
          </span>
        )}
      </div>

      <ol className="flex flex-wrap gap-2" aria-label="Daftar titik tur">
        {titik.map((t, i) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => void pergiKe(i)}
              disabled={!siap || sibuk}
              aria-current={i === idx ? "step" : undefined}
              className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-3 text-sm transition-colors duration-200 disabled:cursor-not-allowed ${
                i === idx
                  ? "bg-primary font-semibold text-white"
                  : "border border-line bg-surface hover:border-primary hover:text-primary disabled:opacity-50"
              }`}
            >
              <span className="font-mono text-xs tabular-nums opacity-80">{i + 1}</span>
              {t.nama}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
