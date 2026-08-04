"use client";

import { Component, Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import ModelMaket from "./ModelMaket";

/**
 * useGLTF melempar saat GLB gagal diambil/di-parse. Tanpa boundary ini, satu berkas
 * rusak merobohkan seluruh halaman (bukan hanya kanvas).
 */
class ModelErrorBoundary extends Component<{ children: ReactNode }, { gagal: boolean }> {
  state = { gagal: false };
  static getDerivedStateFromError() {
    return { gagal: true };
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
}: {
  url: string;
  layerAktif: string[];
  onPick: (featureId: number) => void;
}) {
  return (
    <Canvas
      shadows
      camera={{ position: [140, 140, 140], fov: 40, near: 0.5, far: 8000 }}
      style={{ background: "linear-gradient(160deg, #f7f6f1 0%, #f2f0e8 55%, #ebe8dd 100%)" }}
    >
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
      {/* useGLTF suspending — tanpa Suspense seluruh pohon kanvas menggantung tanpa error */}
      <ModelErrorBoundary>
        <Suspense fallback={null}>
          <ModelMaket url={url} layerAktif={layerAktif} onPick={onPick} />
        </Suspense>
      </ModelErrorBoundary>
      <OrbitControls
        makeDefault
        enableDamping
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={20}
        maxDistance={1500}
      />
    </Canvas>
  );
}
