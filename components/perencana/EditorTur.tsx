"use client";

import { useEffect, useMemo, useState } from "react";
import type { Polygon } from "geojson";
import type { ProjectStatus } from "@prisma/client";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clapperboard,
  Crosshair,
  Eye,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Route,
  Sparkles,
  Trash2,
} from "lucide-react";
import { hitungBasemap } from "@/lib/basemap";
import { useTur } from "@/hooks/useTur";
import {
  buatKlip,
  hapusTitik,
  susunUlangTitik,
  tambahTitik,
  ubahTitik,
  urlFrame,
  urlKlip,
} from "@/lib/tur/klien";
import { periksaLoncatan, poseGambaranUmum, sarankanTitik } from "@/lib/tur/saran";
import type { KlipView, TitikView } from "@/lib/tur/types";
import { MAKS_TITIK_PER_PROYEK } from "@/lib/video/config";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import TurMaket from "@/components/tur/TurMaket";
import type { KameraApiRef } from "@/components/viewer/KameraBridge";
import type { FiturZona } from "@/components/viewer/ModelMaket";
import type { LayerMeta } from "@/components/viewer/types";

const usd = (v: number) => `$${v.toFixed(2).replace(".", ",")}`;

function mmss(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Klip ruas ini sudah valid (siap) atau sedang dibuat -> tidak perlu dibuat lagi. */
const klipCukup = (k: KlipView | undefined) =>
  !!k && (k.status === "QUEUED" || k.status === "RUNNING" || (k.status === "DONE" && !k.basi));

export default function EditorTur({
  projectId,
  status,
  version,
  layersMeta,
  stats,
  boundary,
  kameraApiRef,
  featureTerpilih,
}: {
  projectId: string;
  status: ProjectStatus;
  version: string;
  layersMeta: LayerMeta[];
  stats: unknown;
  boundary: Polygon | null;
  kameraApiRef: KameraApiRef;
  /** Bangunan yang terakhir diklik di viewer — ikut tersimpan pada titik baru. */
  featureTerpilih: number | null;
}) {
  const { tur, mutate, error: galatMuat } = useTur(projectId);
  const [aksi, setAksi] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pratinjau, setPratinjau] = useState(false);
  const [klipDibuka, setKlipDibuka] = useState<string | null>(null);
  const [sekarang, setSekarang] = useState<number | null>(null);

  const geo = useMemo(() => (boundary ? hitungBasemap(boundary) : null), [boundary]);
  const L = geo ? geo.sisiMeter / 1.1 : 200;
  const fitur = (stats as { features?: FiturZona } | undefined)?.features;
  const relief = useMemo(() => {
    const t = (stats as { terrain?: { minElev: number; maxElev: number } | null } | undefined)?.terrain;
    return t ? Math.max(0, t.maxElev - t.minElev) : 0;
  }, [stats]);

  const titik: TitikView[] = useMemo(() => tur?.titik ?? [], [tur]);
  const klipPerRuas = useMemo(() => {
    const m = new Map<string, KlipView>();
    for (const k of tur?.klip ?? []) m.set(`${k.dariId}:${k.keId}`, k);
    return m;
  }, [tur]);
  const ruas = useMemo(
    () => titik.slice(0, -1).map((t, i) => ({ dari: t, ke: titik[i + 1] })),
    [titik],
  );
  const perluKlip = ruas.filter((r) => !klipCukup(klipPerRuas.get(`${r.dari.id}:${r.ke.id}`)));
  const adaFrameBasi = titik.some((t) => t.frameBasi);
  const adaAktif = (tur?.klip ?? []).some((k) => k.status === "QUEUED" || k.status === "RUNNING");
  const biayaKlip = tur?.perkiraan.biayaKlipUsd ?? 0;
  const sibuk = aksi !== null;
  const penuh = titik.length >= MAKS_TITIK_PER_PROYEK;

  useEffect(() => {
    if (!adaAktif) return;
    setSekarang(Date.now());
    const t = setInterval(() => setSekarang(Date.now()), 1000);
    return () => clearInterval(t);
  }, [adaAktif]);

  async function jalankan(nama: string, fn: () => Promise<void>) {
    if (aksi) return;
    setAksi(nama);
    setGalat(null);
    setInfo(null);
    try {
      await fn();
      await mutate();
    } catch (e) {
      setGalat((e as Error).message);
    } finally {
      setAksi(null);
    }
  }

  const api = () => {
    const a = kameraApiRef.current;
    if (!a) throw new Error("Viewer 3D belum siap — tunggu maket selesai dimuat.");
    return a;
  };

  const mulaiGambaranUmum = () =>
    jalankan("Mengambil frame gambaran umum…", async () => {
      const pose = poseGambaranUmum(L, relief * 0.5);
      const frame = await api().ambilFrame(pose);
      await tambahTitik(projectId, { nama: "Gambaran umum", pose, frame });
      await api().terbangKe(pose, 900);
    });

  const tambahDariKamera = () =>
    jalankan("Mengambil frame…", async () => {
      const pose = api().ambilPose();
      const frame = await api().ambilFrame(pose);
      await tambahTitik(projectId, {
        nama: `Titik ${titik.length + 1}`,
        pose,
        frame,
        featureId: featureTerpilih ?? undefined,
      });
    });

  const saranOtomatis = () =>
    jalankan("Menyusun saran titik…", async () => {
      const a = api();
      const ringkas = a.ringkasBangunan();
      if (ringkas.length === 0) throw new Error("Bangunan belum termuat di viewer — coba lagi sebentar lagi.");
      const sisa = MAKS_TITIK_PER_PROYEK - titik.length - (titik.length === 0 ? 1 : 0);
      if (sisa <= 0) throw new Error(`Tur sudah penuh (maks ${MAKS_TITIK_PER_PROYEK} titik).`);
      const saran = sarankanTitik(ringkas, fitur ?? {}, L, Math.min(5, sisa));
      if (saran.length === 0) throw new Error("Tidak ada bangunan yang bisa disarankan.");
      if (
        titik.length > 0 &&
        !window.confirm(`Tambahkan ${saran.length} titik saran di akhir tur yang sudah ada?`)
      ) {
        return;
      }
      const poses = saran.map((s) => s.pose);
      if (titik.length === 0) poses.unshift(poseGambaranUmum(L, relief * 0.5));
      const frames = await a.ambilBanyakFrame(poses);
      let k = 0;
      if (titik.length === 0) {
        await tambahTitik(projectId, { nama: "Gambaran umum", pose: poses[0], frame: frames[0] });
        k = 1;
      }
      for (let i = 0; i < saran.length; i++) {
        await tambahTitik(projectId, {
          nama: saran[i].nama,
          featureId: saran[i].featureId,
          pose: saran[i].pose,
          frame: frames[i + k],
        });
      }
      setInfo(`${saran.length} titik disarankan dan ditambahkan — periksa, ubah nama, atau hapus yang tidak perlu.`);
    });

  const perbaruiSudut = (t: TitikView) =>
    jalankan("Memperbarui sudut…", async () => {
      const pose = api().ambilPose();
      const frame = await api().ambilFrame(pose);
      await ubahTitik(projectId, t.id, { pose, frame });
    });

  const ambilUlangSemuaFrame = () =>
    jalankan("Mengambil ulang semua frame…", async () => {
      const frames = await api().ambilBanyakFrame(titik.map((t) => t.pose));
      for (let i = 0; i < titik.length; i++) {
        await ubahTitik(projectId, titik[i].id, { pose: titik[i].pose, frame: frames[i] });
      }
    });

  const simpanTeks = (t: TitikView, nama: string, deskripsi: string) => {
    const n = nama.trim();
    if (!n || (n === t.nama && deskripsi.trim() === (t.deskripsi ?? ""))) return;
    void jalankan("Menyimpan…", async () => {
      await ubahTitik(projectId, t.id, { nama: n, deskripsi: deskripsi.trim() });
    });
  };

  const pindah = (i: number, delta: -1 | 1) =>
    jalankan("Mengurutkan…", async () => {
      const ids = titik.map((t) => t.id);
      const j = i + delta;
      if (j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      await susunUlangTitik(projectId, ids);
    });

  const hapus = (t: TitikView) => {
    if (!window.confirm(`Hapus titik "${t.nama}"? Klip yang menyentuh titik ini ikut terhapus.`)) return;
    void jalankan("Menghapus…", async () => {
      await hapusTitik(projectId, t.id);
    });
  };

  const buatSemuaKlip = () => {
    if (perluKlip.length === 0) return;
    const taksiran = perluKlip.length * biayaKlip;
    const ok = window.confirm(
      `Buat ${perluKlip.length} klip Seedance (${tur?.perkiraan.resolusi}, ${tur?.perkiraan.durasiDtk} dtk)?\n` +
        `Perkiraan biaya ≈ ${usd(taksiran)} dari kredit BytePlus. Klip yang gagal tidak ditagih.`,
    );
    if (!ok) return;
    void jalankan("Mengirim ke Seedance…", async () => {
      const h = await buatKlip(projectId);
      const catatan = h.dilewati.length > 0 ? ` Dilewati: ${h.dilewati.join("; ")}.` : "";
      setInfo(`${h.dibuat} klip dikirim ke Seedance (≈ ${usd(h.perkiraanBiayaUsd)}).${catatan}`);
    });
  };

  const bisaDiubah = status === "REVIEW_PERENCANA" || status === "SELESAI";

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Route size={19} className="text-primary" aria-hidden />
          Tur Maket
        </h2>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted">
          Putar kamera di viewer ke sudut yang diinginkan, lalu tambahkan sebagai titik. Setiap dua titik
          berurutan dapat dibuat menjadi klip video Seedance; pengunjung menonton klip lalu menjelajah
          maket 3D langsung di titik itu. Tur ini hanya mencakup eksterior kawasan.
        </p>
      </div>

      {galatMuat && <Alert>Gagal memuat tur: {galatMuat.message}</Alert>}
      {galat && <Alert>{galat}</Alert>}
      {info && <Alert varian="sukses">{info}</Alert>}
      {!bisaDiubah && <Alert>Tur hanya bisa diubah saat status REVIEW_PERENCANA atau SELESAI.</Alert>}

      <div className="flex flex-wrap items-center gap-2.5">
        {titik.length === 0 ? (
          <Button onClick={mulaiGambaranUmum} disabled={sibuk || !bisaDiubah}>
            <Plus size={17} aria-hidden />
            Mulai dengan gambaran umum
          </Button>
        ) : (
          <Button onClick={tambahDariKamera} disabled={sibuk || penuh || !bisaDiubah}>
            <Crosshair size={17} aria-hidden />
            Tambah titik di sudut kamera ini
          </Button>
        )}
        <Button variant="secondary" onClick={saranOtomatis} disabled={sibuk || penuh || !bisaDiubah}>
          <Sparkles size={17} aria-hidden />
          Saran otomatis
        </Button>
        {sibuk && (
          <span className="flex items-center gap-1.5 text-sm text-muted">
            <Loader2 size={15} className="animate-spin" aria-hidden />
            {aksi}
          </span>
        )}
        <span className="ml-auto font-mono text-xs text-muted">
          {titik.length}/{MAKS_TITIK_PER_PROYEK} titik
          {featureTerpilih != null && ` · bangunan #${featureTerpilih} terpilih`}
        </span>
      </div>

      {titik.length > 0 && (
        <ol className="space-y-1">
          {titik.map((t, i) => {
            const berikut = titik[i + 1];
            const klip = berikut ? klipPerRuas.get(`${t.id}:${berikut.id}`) : undefined;
            const peringatan = berikut ? periksaLoncatan(t.pose, berikut.pose, L) : null;
            const aktif = klip?.status === "QUEUED" || klip?.status === "RUNNING";
            return (
              <li key={t.id}>
                <div className="flex flex-wrap items-start gap-3 rounded-lg border border-line bg-background p-3">
                  {t.adaFrame ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={urlFrame(projectId, t.id, t.diperbaruiMs)}
                      alt={`Frame titik ${i + 1}: ${t.nama}`}
                      width={160}
                      height={90}
                      className="aspect-video w-40 shrink-0 rounded border border-line object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video w-40 shrink-0 items-center justify-center rounded border border-dashed border-line text-xs text-muted">
                      tanpa frame
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs tabular-nums text-primary">{i + 1}</span>
                      <input
                        key={`n-${t.id}-${t.nama}`}
                        defaultValue={t.nama}
                        maxLength={80}
                        aria-label={`Nama titik ${i + 1}`}
                        disabled={!bisaDiubah}
                        onBlur={(e) => simpanTeks(t, e.target.value, t.deskripsi ?? "")}
                        className="min-h-9 w-full min-w-0 rounded-md border border-line bg-surface px-2.5 text-sm font-semibold focus:border-primary focus:outline-none"
                      />
                    </div>
                    <textarea
                      key={`d-${t.id}-${t.deskripsi ?? ""}`}
                      defaultValue={t.deskripsi ?? ""}
                      maxLength={500}
                      rows={2}
                      placeholder="Deskripsi singkat yang dibaca pengunjung (opsional)"
                      aria-label={`Deskripsi titik ${i + 1}`}
                      disabled={!bisaDiubah}
                      onBlur={(e) => simpanTeks(t, t.nama, e.target.value)}
                      className="w-full resize-y rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
                    />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted">
                      {t.featureId != null && <span>bangunan #{t.featureId}</span>}
                      {t.frameBasi && t.adaFrame && (
                        <span className="text-amber-700">frame dari versi maket lama</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1">
                    <button
                      type="button"
                      title="Arahkan viewer ke titik ini"
                      aria-label={`Lihat titik ${i + 1} di viewer`}
                      onClick={() => void kameraApiRef.current?.terbangKe(t.pose, 1000)}
                      className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-200 hover:bg-surface hover:text-primary"
                    >
                      <Eye size={16} aria-hidden />
                    </button>
                    <button
                      type="button"
                      title="Pakai sudut kamera viewer saat ini untuk titik ini"
                      aria-label={`Perbarui sudut titik ${i + 1}`}
                      disabled={sibuk || !bisaDiubah}
                      onClick={() => void perbaruiSudut(t)}
                      className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-200 hover:bg-surface hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Crosshair size={16} aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={`Naikkan titik ${i + 1}`}
                      disabled={sibuk || i === 0 || !bisaDiubah}
                      onClick={() => void pindah(i, -1)}
                      className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-200 hover:bg-surface hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowUp size={16} aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={`Turunkan titik ${i + 1}`}
                      disabled={sibuk || i === titik.length - 1 || !bisaDiubah}
                      onClick={() => void pindah(i, 1)}
                      className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-200 hover:bg-surface hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowDown size={16} aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={`Hapus titik ${i + 1}`}
                      disabled={sibuk || !bisaDiubah}
                      onClick={() => hapus(t)}
                      className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-200 hover:bg-rose-50 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </div>
                </div>

                {berikut && (
                  <div className="ml-6 border-l-2 border-line py-2 pl-4 text-sm">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Clapperboard size={14} className="text-muted" aria-hidden />
                      <span className="text-muted">
                        {i + 1} → {i + 2}:
                      </span>
                      {!klip && <span className="text-muted">belum ada klip — tur memakai kamera live</span>}
                      {aktif && (
                        <span className="flex items-center gap-1.5 text-primary">
                          <Loader2 size={13} className="animate-spin" aria-hidden />
                          {klip?.status === "QUEUED" ? "Menunggu giliran…" : "Seedance membuat klip…"}
                          {sekarang != null && (
                            <span className="font-mono text-xs tabular-nums">
                              {mmss(sekarang - (klip?.mulaiMs ?? klip?.dibuatMs ?? sekarang))}
                            </span>
                          )}
                        </span>
                      )}
                      {klip?.status === "DONE" && !klip.basi && (
                        <>
                          <span className="flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 size={14} aria-hidden />
                            klip siap
                          </span>
                          <button
                            type="button"
                            onClick={() => setKlipDibuka(klipDibuka === klip.id ? null : klip.id)}
                            className="inline-flex cursor-pointer items-center gap-1 text-primary underline-offset-2 hover:underline"
                          >
                            <Play size={12} aria-hidden />
                            {klipDibuka === klip.id ? "Tutup" : "Tonton"}
                          </button>
                        </>
                      )}
                      {klip?.status === "DONE" && klip.basi && (
                        <span className="text-amber-700">klip basi — pose atau maket berubah, buat ulang</span>
                      )}
                      {klip?.status === "ERROR" && (
                        <span className="text-danger">gagal: {klip.error ?? "kesalahan tidak diketahui"}</span>
                      )}
                    </p>
                    {peringatan && (
                      <p className="mt-1 flex items-start gap-1.5 text-xs text-amber-700">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />
                        {peringatan}
                      </p>
                    )}
                    {klip && klipDibuka === klip.id && (
                      <video
                        src={urlKlip(projectId, klip.id)}
                        controls
                        muted
                        playsInline
                        className="mt-2 aspect-video w-full max-w-md rounded border border-line"
                      />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {titik.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <Button
            onClick={buatSemuaKlip}
            disabled={sibuk || perluKlip.length === 0 || adaFrameBasi || !bisaDiubah}
          >
            <Clapperboard size={17} aria-hidden />
            {perluKlip.length > 0
              ? `Buat ${perluKlip.length} klip (≈ ${usd(perluKlip.length * biayaKlip)})`
              : "Semua klip sudah dibuat"}
          </Button>
          {adaFrameBasi && (
            <Button variant="secondary" onClick={ambilUlangSemuaFrame} disabled={sibuk || !bisaDiubah}>
              <RefreshCw size={17} aria-hidden />
              Ambil ulang semua frame
            </Button>
          )}
          <Button variant="secondary" onClick={() => setPratinjau((v) => !v)} disabled={titik.length === 0}>
            <Play size={17} aria-hidden />
            {pratinjau ? "Tutup pratinjau" : "Pratinjau tur"}
          </Button>
          {tur && (
            <span className="font-mono text-xs text-muted">
              {tur.perkiraan.resolusi} · {tur.perkiraan.durasiDtk} dtk · ≈ {usd(biayaKlip)}/klip
            </span>
          )}
        </div>
      )}
      {adaFrameBasi && (
        <Alert>
          Maket di-generate ulang sejak sebagian frame diambil. Ambil ulang frame sebelum membuat klip;
          bila bentuk bangunan bergeser, atur ulang sudut titik yang terkena.
        </Alert>
      )}

      {pratinjau && tur && titik.some((t) => t.adaFrame) && (
        <div className="border-t border-line pt-4">
          <TurMaket
            projectId={projectId}
            version={version}
            layersMeta={layersMeta}
            stats={stats}
            boundary={boundary}
            tur={tur}
          />
        </div>
      )}
    </Card>
  );
}
