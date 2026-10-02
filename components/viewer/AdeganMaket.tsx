"use client";

import { Component, Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import ModelMaket, { type FiturZona } from "./ModelMaket";
import BasemapPlane from "./BasemapPlane";
import KameraBridge, { type KameraApiRef } from "./KameraBridge";
import { LATAR_TUR_HEX } from "@/lib/render/paletMaket";
import { FOV_TUR } from "@/lib/tur/saran";
import type { Pose } from "@/lib/tur/types";

/**
 * useGLTF melempar saat GLB gagal diambil/di-parse. Tanpa boundary ini, satu berkas
 * rusak merobohkan seluruh halaman (bukan hanya kanvas).
 */
class ModelErrorBoundary extends Component<
  { children: ReactNode; onError?: (pesan: string) => void },
  { gagal: boolean }
> {
  state = { gagal: false };
  static getDerivedStateFromError() {
    return { gagal: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError?.(error.message || "Gagal memuat");
  }
  render() {
    if (this.state.gagal) return null; // kanvas tetap hidup; pesan ditampilkan overlay di bawah
    return this.props.children;
  }
}

export default function AdeganMaket({
  url,
  layerAktif,
  onPick,
  basemapUrl,
  basemapSisi,
  basemapTinggi,
  onBasemapLoaded,
  onBasemapError,
  modeWarna = false,
  fitur,
  kameraApiRef,
  latarSolid = false,
  poseAwal,
  jarakMaks = 1500,
}: {
  url: string;
  layerAktif: string[];
  onPick: (featureId: number) => void;
  basemapUrl?: string | null;
  basemapSisi?: number;
  basemapTinggi?: number;
  onBasemapLoaded?: () => void;
  onBasemapError?: (pesan: string) => void;
  /** Maket berwarna gaya arsitek (palet bersama dgn prompt Seedance). */
  modeWarna?: boolean;
  /** stats.features — sumber zoneType untuk warna atap. */
  fitur?: FiturZona;
  /** Diisi KameraBridge: ambil/atur pose, terbang, capture frame. Lewat prop biasa karena komponen ini dimuat via next/dynamic. */
  kameraApiRef?: KameraApiRef;
  /** Latar solid (bukan gradien CSS) — WAJIB agar tur live identik dengan frame yang di-capture. */
  latarSolid?: boolean;
  poseAwal?: Pose;
  /** Naikkan untuk kawasan besar; OrbitControls menjepit kamera ke jarak ini. */
  jarakMaks?: number;
}) {
  return (
    <Canvas
      shadows
      camera={{
        position: poseAwal?.pos ?? [140, 140, 140],
        fov: FOV_TUR,
        near: 0.5,
        far: Math.max(8000, jarakMaks * 4),
      }}
      style={{
        background: latarSolid
          ? LATAR_TUR_HEX
          : "linear-gradient(160deg, #f7f6f1 0%, #f2f0e8 55%, #ebe8dd 100%)",
      }}
    >
      {latarSolid && <color attach="background" args={[LATAR_TUR_HEX]} />}
      <hemisphereLight args={["#ffffff", "#d9d2c5", 0.6]} />
      <directionalLight
        position={[80, 140, 60]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-300}
        shadow-camera-right={300}
        shadow-camera-top={300}
        shadow-camera-bottom={-300}
        shadow-camera-far={800}
      />
      {/* Boundary terpisah dari model: basemap gagal ≠ model hilang. key={basemapUrl}
          memaksa remount saat ganti mode satelit/peta — reset error boundary
          & pemuatan tekstur lama, bukan hanya berharap effect ganti url. */}
      {basemapUrl && basemapSisi && (
        <ModelErrorBoundary key={basemapUrl} onError={onBasemapError}>
          <BasemapPlane
            url={basemapUrl}
            sisi={basemapSisi}
            tinggi={basemapTinggi ?? basemapSisi}
            onLoaded={onBasemapLoaded}
            onError={onBasemapError}
          />
        </ModelErrorBoundary>
      )}
      {/* useGLTF suspending — tanpa Suspense seluruh pohon kanvas menggantung tanpa error */}
      <ModelErrorBoundary>
        <Suspense fallback={null}>
          <ModelMaket
            url={url}
            layerAktif={layerAktif}
            onPick={onPick}
            modeWarna={modeWarna}
            fitur={fitur}
          />
        </Suspense>
      </ModelErrorBoundary>
      <OrbitControls
        makeDefault
        enableDamping
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={20}
        maxDistance={jarakMaks}
        target={poseAwal?.target}
      />
      {kameraApiRef && <KameraBridge apiRef={kameraApiRef} />}
    </Canvas>
  );
}
