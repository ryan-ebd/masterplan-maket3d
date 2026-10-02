"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { KeadaanTur } from "@/lib/tur/types";

const adaKlipAktif = (t: KeadaanTur | undefined) =>
  !!t?.klip.some((k) => k.status === "QUEUED" || k.status === "RUNNING");

/**
 * Keadaan tur (titik + klip). Polling 4 dtk selama ada klip QUEUED/RUNNING, lalu berhenti.
 * Seedance tidak melaporkan persentase, jadi UI menampilkan waktu berjalan, bukan progres palsu.
 *
 * Polling sengaja interval eksplisit, bukan opsi `refreshInterval` SWR: SWR hanya memulai
 * siklus polling saat mount (interval dievaluasi saat itu). Klip biasanya dibuat SETELAH mount,
 * jadi siklusnya tidak pernah menyala dan UI tertinggal di status lama.
 */
export function useTur(projectId: string) {
  const { data, error, mutate, isLoading } = useSWR<KeadaanTur>(
    `/api/projects/${projectId}/tur`,
    (url: string) => fetcher<KeadaanTur>(url),
    { revalidateOnFocus: false },
  );

  const aktif = adaKlipAktif(data);
  useEffect(() => {
    if (!aktif) return;
    const t = setInterval(() => {
      void mutate();
    }, 4000);
    return () => clearInterval(t);
  }, [aktif, mutate]);

  return { tur: data, error: error as Error | undefined, mutate, isLoading };
}
