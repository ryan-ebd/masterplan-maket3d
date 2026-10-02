"use client";

import { useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three/examples/jsm/controls/OrbitControls.js";
import { LATAR_TUR_HEX } from "@/lib/render/paletMaket";
import { FOV_TUR, type RingkasBangunan } from "@/lib/tur/saran";
import type { Pose } from "@/lib/tur/types";
import { FRAME_LEBAR, FRAME_TINGGI } from "@/lib/video/config";

/** API kamera yang diekspos kanvas ke luar (lewat ref). */
export interface KameraApi {
  ambilPose(): Pose;
  /** Pindah seketika (tanpa animasi). */
  setPose(pose: Pose): void;
  /** Animasi halus; resolve saat tiba atau dibatalkan (pengguna mulai menggeser, atau panggilan baru). */
  terbangKe(pose: Pose, ms: number): Promise<void>;
  /** PNG 1280×720 dari pose tertentu, tanpa mengganggu tampilan viewer. */
  ambilFrame(pose: Pose): Promise<Blob>;
  /** Beberapa pose berurutan dalam satu sesi (pemanggil cukup menyiapkan viewer sekali). */
  ambilBanyakFrame(poses: Pose[]): Promise<Blob[]>;
  /** Centroid + dimensi tiap bangunan (untuk saran otomatis). Kosong bila model belum termuat. */
  ringkasBangunan(): RingkasBangunan[];
}

export type KameraApiRef = { current: KameraApi | null };

const rafPromise = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export default function KameraBridge({ apiRef }: { apiRef: KameraApiRef }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const get = useThree((s) => s.get);

  useEffect(() => {
    let tokenAnimasi = 0;

    const kontrol = () => get().controls as OrbitControlsImpl | null;
    const kamera = () => get().camera as THREE.PerspectiveCamera;

    function setPose(p: Pose) {
      const cam = kamera();
      const c = kontrol();
      cam.position.set(...p.pos);
      if (c) {
        c.target.set(...p.target);
        c.update();
      } else {
        cam.lookAt(...p.target);
      }
    }

    function ambilPose(): Pose {
      const cam = kamera();
      const t = kontrol()?.target;
      const target = t ?? new THREE.Vector3(0, 0, 0);
      return {
        pos: [cam.position.x, cam.position.y, cam.position.z],
        target: [target.x, target.y, target.z],
      };
    }

    function terbangKe(tujuan: Pose, ms: number): Promise<void> {
      const token = ++tokenAnimasi; // panggilan baru membatalkan yang lama
      const awal = ambilPose();
      const c = kontrol();
      return new Promise((resolve) => {
        const batal = () => {
          tokenAnimasi++;
        };
        c?.addEventListener("start", batal);
        const mulai = performance.now();
        const langkah = (now: number) => {
          if (token !== tokenAnimasi) {
            c?.removeEventListener("start", batal);
            resolve();
            return;
          }
          const t = Math.min(1, (now - mulai) / Math.max(1, ms));
          const e = easeInOut(t);
          const mix = (a: number[], b: number[]) =>
            [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e] as [
              number,
              number,
              number,
            ];
          setPose({ pos: mix(awal.pos, tujuan.pos), target: mix(awal.target, tujuan.target) });
          if (t >= 1) {
            c?.removeEventListener("start", batal);
            resolve();
            return;
          }
          requestAnimationFrame(langkah);
        };
        requestAnimationFrame(langkah);
      });
    }

    async function ambilFrame(pose: Pose): Promise<Blob> {
      // Pastikan frame terakhir sudah tergambar (efek warna/layer dari pemanggil sudah berlaku).
      await rafPromise();
      await rafPromise();

      const cam = kamera();
      // --- Satu task SINKRON dari sini: tidak ada paint di antara ubah-ukuran dan pulihkan,
      // jadi pengguna tidak melihat kanvas melar. toDataURL harus dipanggil tepat setelah
      // render karena drawing buffer tidak dipertahankan (preserveDrawingBuffer = false).
      const ukuranLama = gl.getSize(new THREE.Vector2());
      const prLama = gl.getPixelRatio();
      const latarLama = scene.background;
      let dataUrl: string;
      try {
        gl.setPixelRatio(1);
        gl.setSize(FRAME_LEBAR, FRAME_TINGGI, false);
        const cap = new THREE.PerspectiveCamera(FOV_TUR, FRAME_LEBAR / FRAME_TINGGI, cam.near, cam.far);
        cap.position.set(...pose.pos);
        cap.lookAt(...pose.target);
        cap.updateMatrixWorld(true);
        scene.background = new THREE.Color(LATAR_TUR_HEX);
        gl.render(scene, cap);
        dataUrl = gl.domElement.toDataURL("image/png");
      } finally {
        scene.background = latarLama;
        gl.setPixelRatio(prLama);
        gl.setSize(ukuranLama.x, ukuranLama.y, false);
      }
      const res = await fetch(dataUrl);
      return res.blob();
    }

    async function ambilBanyakFrame(poses: Pose[]): Promise<Blob[]> {
      const hasil: Blob[] = [];
      for (const p of poses) hasil.push(await ambilFrame(p));
      return hasil;
    }

    function ringkasBangunan(): RingkasBangunan[] {
      const hasil = new Map<number, { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number }>();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh || (obj.userData as { layer?: string }).layer !== "bangunan") return;
        const geom = mesh.geometry;
        const pos = geom.getAttribute("position");
        const fid = (geom.getAttribute("_featureid") ?? geom.getAttribute("_FEATUREID")) as
          | THREE.BufferAttribute
          | undefined;
        if (!fid) return;
        mesh.updateWorldMatrix(true, false);
        const v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
          const id = fid.getX(i);
          const r = hasil.get(id);
          if (!r) {
            hasil.set(id, { x0: v.x, x1: v.x, z0: v.z, z1: v.z, y0: v.y, y1: v.y });
          } else {
            if (v.x < r.x0) r.x0 = v.x;
            if (v.x > r.x1) r.x1 = v.x;
            if (v.z < r.z0) r.z0 = v.z;
            if (v.z > r.z1) r.z1 = v.z;
            if (v.y < r.y0) r.y0 = v.y;
            if (v.y > r.y1) r.y1 = v.y;
          }
        }
      });
      return [...hasil.entries()].map(([featureId, r]) => ({
        featureId,
        x: (r.x0 + r.x1) / 2,
        z: (r.z0 + r.z1) / 2,
        lebar: Math.max(r.x1 - r.x0, r.z1 - r.z0),
        luas: (r.x1 - r.x0) * (r.z1 - r.z0),
        yDasar: r.y0,
        yAtas: r.y1,
      }));
    }

    const api: KameraApi = {
      ambilPose,
      setPose,
      terbangKe,
      ambilFrame,
      ambilBanyakFrame,
      ringkasBangunan,
    };
    apiRef.current = api;
    return () => {
      tokenAnimasi++;
      if (apiRef.current === api) apiRef.current = null;
    };
  }, [apiRef, gl, scene, get]);

  return null;
}
