"use client";

import { useRef } from "react";
import useSWR from "swr";
import type { JobStatus } from "@prisma/client";
import { fetcher } from "@/lib/fetcher";

export interface JobInfo {
  id: string;
  status: JobStatus;
  step: string | null;
  progress: number;
  error: string | null;
}

const berjalan = (j: JobInfo | null | undefined) =>
  j?.status === "QUEUED" || j?.status === "RUNNING";

/**
 * Polling status job: 3.5 dtk selama QUEUED/RUNNING, berhenti saat terminal.
 * fallbackData (job dari SSR) mencegah fetch ulang saat mount untuk job yang
 * sudah selesai; onSelesai dipanggil saat status berpindah ke DONE/ERROR.
 */
export function useStatusJob(
  projectId: string,
  opts: { fallbackData?: JobInfo | null; onSelesai?: () => void } = {},
) {
  const prevStatus = useRef<JobStatus | undefined>(opts.fallbackData?.status);
  const { data, mutate, isLoading } = useSWR<JobInfo | null>(
    `/api/projects/${projectId}/job`,
    (url: string) => fetcher<JobInfo | null>(url),
    {
      fallbackData: opts.fallbackData,
      revalidateOnMount: opts.fallbackData !== undefined ? berjalan(opts.fallbackData) : true,
      refreshInterval: (latest) => (berjalan(latest) ? 3500 : 0),
      revalidateOnFocus: false,
      onSuccess: (j) => {
        if (prevStatus.current !== j?.status) {
          if (j?.status === "DONE" || j?.status === "ERROR") opts.onSelesai?.();
          prevStatus.current = j?.status;
        }
      },
    },
  );
  return { job: data ?? null, mutate, isLoading };
}
