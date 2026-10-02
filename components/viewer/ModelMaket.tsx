"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { WARNA_DINDING, WARNA_LAYER, warnaAtap } from "@/lib/render/paletMaket";

export type FiturZona = Record<string, { zoneType?: string } | undefined>;

interface CatatanGeometri {
  asli: THREE.BufferGeometry;
  warna?: THREE.BufferGeometry;
  fitur?: FiturZona;
}

/**
 * Klon geometri `bangunan` menjadi non-indexed + atribut `color`: dinding krem, atap
 * diwarnai per zoneType. Atap vs dinding ditentukan dari normal muka (|normal.y| > 0,3):
 * dinding vertikal (≈0), atap datar (1) maupun miring (≥ cos 45° ≈ 0,7). Non-indexed
 * supaya vertex yang dipakai bersama atap & dinding tidak saling "meminjam" warna.
 */
function buatGeometriWarna(geom: THREE.BufferGeometry, fitur: FiturZona): THREE.BufferGeometry {
  const g = geom.index ? geom.toNonIndexed() : geom.clone();
  const pos = g.getAttribute("position");
  const fid = (g.getAttribute("_featureid") ?? g.getAttribute("_FEATUREID")) as
    | THREE.BufferAttribute
    | undefined;
  const data = new Float32Array(pos.count * 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  const dinding = new THREE.Color(WARNA_DINDING.hex);
  const cacheAtap = new Map<string, THREE.Color>();
  const atapZona = (zona: string | undefined) => {
    const k = zona ?? "";
    let w = cacheAtap.get(k);
    if (!w) cacheAtap.set(k, (w = new THREE.Color(warnaAtap(zona).hex)));
    return w;
  };

  for (let t = 0; t + 2 < pos.count; t += 3) {
    a.fromBufferAttribute(pos, t);
    b.fromBufferAttribute(pos, t + 1);
    c.fromBufferAttribute(pos, t + 2);
    n.crossVectors(b.sub(a), c.sub(a)).normalize();
    const atap = Math.abs(n.y) > 0.3;
    const zona = fid ? fitur[String(fid.getX(t))]?.zoneType : undefined;
    const w = atap ? atapZona(zona) : dinding;
    for (let k = 0; k < 3; k++) {
      const o = (t + k) * 3;
      data[o] = w.r;
      data[o + 1] = w.g;
      data[o + 2] = w.b;
    }
  }
  g.setAttribute("color", new THREE.BufferAttribute(data, 3));
  return g;
}

export default function ModelMaket({
  url,
  layerAktif,
  onPick,
  modeWarna = false,
  fitur,
}: {
  url: string;
  layerAktif: string[];
  onPick: (featureId: number) => void;
  /** Maket berwarna gaya arsitek (lib/render/paletMaket.ts); mati = material GLB apa adanya. */
  modeWarna?: boolean;
  /** stats.features — sumber zoneType untuk warna atap. */
  fitur?: FiturZona;
}) {
  const { scene: sceneCache } = useGLTF(url);

  // useGLTF meng-cache SATU scene per url. Dua kanvas (viewer editor + pratinjau tur)
  // yang memakai scene yang sama akan saling merebut induknya, dan mengubah warna di
  // satu kanvas ikut mengubah yang lain. Klon scene + material per instance.
  const scene = useMemo(() => {
    const klon = sceneCache.clone(true);
    klon.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.material = Array.isArray(m.material)
          ? m.material.map((x) => x.clone())
          : (m.material as THREE.Material).clone();
      }
    });
    return klon;
  }, [sceneCache]);

  const geomRef = useRef(new WeakMap<THREE.Mesh, CatatanGeometri>());
  const warnaAsliRef = useRef(new WeakMap<THREE.Material, THREE.Color>());

  useEffect(() => {
    const geomMap = geomRef.current;
    return () => {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
        geomMap.get(m)?.warna?.dispose();
      });
    };
  }, [scene]);

  // Bayangan on — material dari GLB dipakai APA ADANYA kecuali modeWarna aktif
  useEffect(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, [scene]);

  // Pewarnaan maket. Layer dikenali dari glTF extras -> userData.layer (JANGAN dari nama
  // node: three menyanitasi "layer:bangunan" -> "layerbangunan"); mesh khusus seperti
  // "pohon-batang" dikenali dari nama material (tidak disanitasi).
  useEffect(() => {
    const fiturKini = fitur ?? {};
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const layer = (obj.userData as { layer?: string } | undefined)?.layer;
      if (!warnaAsliRef.current.has(mat)) warnaAsliRef.current.set(mat, mat.color.clone());
      const asli = warnaAsliRef.current.get(mat)!;

      if (layer === "bangunan") {
        let rec = geomRef.current.get(mesh);
        if (!rec) geomRef.current.set(mesh, (rec = { asli: mesh.geometry }));
        if (modeWarna) {
          if (!rec.warna || rec.fitur !== fitur) {
            rec.warna?.dispose();
            rec.warna = buatGeometriWarna(rec.asli, fiturKini);
            rec.fitur = fitur;
          }
          mesh.geometry = rec.warna;
          mat.vertexColors = true;
          mat.color.set(0xffffff);
        } else {
          mesh.geometry = rec.asli;
          mat.vertexColors = false;
          mat.color.copy(asli);
        }
      } else {
        const w = WARNA_LAYER[mat.name] ?? (layer ? WARNA_LAYER[layer] : undefined);
        if (modeWarna && w) mat.color.set(w.hex);
        else mat.color.copy(asli);
      }
      mat.needsUpdate = true;
    });
  }, [scene, modeWarna, fitur]);

  // Toggle layer via glTF extras -> userData.layer.
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
