"use client";

import { useEffect } from "react";
import { SRGBColorSpace } from "three";
import { useTexture } from "@react-three/drei";

/**
 * Plane citra basemap. Center gambar = centroid boundary = origin scene,
 * gambar utara-atas + sumbu scene Z=−utara → sejajar tanpa transform tambahan.
 */
export default function BasemapPlane({ url, sisi }: { url: string; sisi: number }) {
  const tex = useTexture(url);

  useEffect(() => {
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
  }, [tex]);

  return (
    // Backdrop murni: tanpa depthWrite + renderOrder -1 agar tidak z-fight
    // dengan jalan/terrain di y≈0 (kamera selalu di atas horizon).
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} renderOrder={-1}>
      <planeGeometry args={[sisi, sisi]} />
      <meshBasicMaterial map={tex} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}
