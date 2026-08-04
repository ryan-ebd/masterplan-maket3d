"use client";

import { useEffect } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";

export default function ModelMaket({
  url,
  layerAktif,
  onPick,
}: {
  url: string;
  layerAktif: string[];
  onPick: (featureId: number) => void;
}) {
  const { scene } = useGLTF(url);

  // Bayangan on — material dari GLB dipakai APA ADANYA (gaya maket sudah diset pipeline)
  useEffect(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, [scene]);

  // Toggle layer via glTF extras -> userData.layer.
  // JANGAN pakai prefix nama node: three menyanitasi "layer:bangunan" -> "layerbangunan".
  useEffect(() => {
    scene.traverse((obj) => {
      const layer = (obj.userData as { layer?: string } | undefined)?.layer;
      if (layer) obj.visible = layerAktif.includes(layer);
    });
  }, [scene, layerAktif]);

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    const mesh = e.object as THREE.Mesh;
    const geom = mesh.geometry as THREE.BufferGeometry | undefined;
    // GLTFLoader me-lowercase-kan atribut kustom: _FEATUREID -> _featureid
    const attr = (geom?.getAttribute("_featureid") ?? geom?.getAttribute("_FEATUREID")) as
      | THREE.BufferAttribute
      | undefined;
    if (!attr || e.faceIndex == null) return;
    const vi = geom!.index ? geom!.index.getX(e.faceIndex * 3) : e.faceIndex * 3;
    onPick(attr.getX(vi));
  }

  return <primitive object={scene} onClick={handleClick} />;
}
