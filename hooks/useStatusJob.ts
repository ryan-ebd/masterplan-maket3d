"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export interface JobInfo {
  id: string;
  status: "QUEUED" | "RUNNING" | "DONE" | "ERROR";
  step: string | null;
  progress: number;
  error: string | null;
}

/** Polling status job: 3.5 dtk selama QUEUED/RUNNING, berhenti saat DONE/ERROR. */
export function useStatusJob(projectId: string, aktif: boolean) {
  const { data, mutate, isLoading } = useSWR<JobInfo | null>(
    aktif ? `/api/projects/${projectId}/job` : null,
    (url: string) => fetcher<JobInfo | null>(url),
    {
      refreshInterval: (latest) =>
        latest && (latest.status === "QUEUED" || latest.status === "RUNNING") ? 3500 : 0,
      revalidateOnFocus: true,
    },
  );
  return { job: data ?? null, mutate, isLoading };
}
