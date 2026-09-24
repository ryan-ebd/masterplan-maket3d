"use client";

import { useEffect, useRef, useState } from "react";
import { SRGBColorSpace, TextureLoader, type Texture } from "three";

/**
 * Plane citra basemap. Center gambar = centroid boundary = origin scene,
 * gambar utara-atas + sumbu scene Z=−utara → sejajar tanpa transform tambahan.
 *
 * Fetch manual (bukan drei useTexture/Suspense): endpoint bisa balas JSON
 * error (4xx/5xx — key hilang, quota Google, dsb). TextureLoader langsung
 * mengubah itu jadi pesan generik ("undefined") karena mencoba membacanya
 * sebagai gambar. Fetch manual bisa membaca `error.message` asli untuk `onError`.
 */
export default function BasemapPlane({
  url,
  sisi,
  tinggi,
  onLoaded,
  onError,
}: {
  url: string;
  /** Extent timur–barat (meter model). */
  sisi: number;
  /** Extent utara–selatan (meter model) — sedikit < sisi karena Mercator vs equirectangular. */
  tinggi: number;
  onLoaded?: () => void;
  onError?: (pesan: string) => void;
}) {
  const [tex, setTex] = useState<Texture | null>(null);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let batal = false;
    let texture: Texture | null = null;
    setTex(null);

    (async () => {
      let objectUrl: string | null = null;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          let pesan = `Gagal memuat citra (HTTP ${res.status})`;
          try {
            const body = await res.json();
            if (body?.error?.message) pesan = body.error.message;
          } catch {
            // respons bukan JSON — pakai pesan default di atas
          }
          throw new Error(pesan);
        }
        const blob = await res.blob();
        if (batal) return;
        objectUrl = URL.createObjectURL(blob);
        texture = await new TextureLoader().loadAsync(objectUrl);
        if (batal) {
          texture.dispose();
          return;
        }
        texture.colorSpace = SRGBColorSpace;
        texture.anisotropy = 8;
        texture.needsUpdate = true;
        setTex(texture);
        onLoadedRef.current?.();
      } catch (e) {
        if (!batal) onErrorRef.current?.((e as Error).message || "Gagal memuat citra alas peta");
      } finally {
        // Gambar sudah didekode ke tekstur — blob URL tidak diperlukan lagi.
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }
    })();

    return () => {
      batal = true;
      texture?.dispose();
    };
  }, [url]);

  if (!tex) return null;

  return (
    // Alas pengganti terrain/papan: menulis depth agar sisi bangunan di bawah
    // tanah (baseZ −0.5) tidak tembus, polygonOffset mendorong depth plane
    // sedikit menjauh supaya air (+0.1) dan jalan (+0.3) menang tanpa z-fight
    // pada far:8000. renderOrder −1: digambar pertama sebagai backdrop.
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} renderOrder={-1}>
      <planeGeometry args={[sisi, tinggi]} />
      <meshBasicMaterial
        map={tex}
        toneMapped={false}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
    </mesh>
  );
}
