// Helper fetch sisi browser untuk API tur. Terpisah dari lib/fetcher.ts karena unggahan
// frame memakai multipart (fetcher memaksa Content-Type JSON). Amplop respons sama: {ok,data}/{ok:false,error}.
import { fetcher } from "@/lib/fetcher";
import type { Pose } from "./types";

const dasar = (projectId: string) => `/api/projects/${projectId}/tur`;

async function kirimForm<T>(url: string, method: "POST" | "PATCH", form: FormData): Promise<T> {
  const res = await fetch(url, { method, body: form });
  let body: { ok?: boolean; data?: T; error?: { message?: string; fields?: Record<string, string[]> } } | null = null;
  try {
    body = await res.json();
  } catch {
    // bukan JSON
  }
  if (!res.ok || !body?.ok) {
    const msg =
      body?.error?.message ??
      (body?.error?.fields ? Object.values(body.error.fields).flat().join("; ") : null) ??
      `Permintaan gagal (HTTP ${res.status})`;
    throw new Error(msg);
  }
  return body.data as T;
}

export interface BidangTitik {
  nama?: string;
  deskripsi?: string;
  featureId?: number;
  pose?: Pose;
  frame?: Blob;
}

function susunForm(b: BidangTitik): FormData {
  const f = new FormData();
  if (b.nama !== undefined) f.set("nama", b.nama);
  if (b.deskripsi !== undefined) f.set("deskripsi", b.deskripsi); // "" = kosongkan
  if (b.featureId !== undefined) f.set("featureId", String(b.featureId));
  if (b.pose) {
    f.set("pos", JSON.stringify(b.pose.pos));
    f.set("target", JSON.stringify(b.pose.target));
  }
  if (b.frame) f.set("frame", b.frame, "frame.png");
  return f;
}

export const tambahTitik = (projectId: string, b: BidangTitik & { nama: string; pose: Pose; frame: Blob }) =>
  kirimForm<{ id: string }>(`${dasar(projectId)}/titik`, "POST", susunForm(b));

export const ubahTitik = (projectId: string, titikId: string, b: BidangTitik) =>
  kirimForm<{ id: string }>(`${dasar(projectId)}/titik/${titikId}`, "PATCH", susunForm(b));

export const hapusTitik = (projectId: string, titikId: string) =>
  fetcher<{ id: string }>(`${dasar(projectId)}/titik/${titikId}`, { method: "DELETE" });

export const susunUlangTitik = (projectId: string, ids: string[]) =>
  fetcher<{ ids: string[] }>(`${dasar(projectId)}/urutan`, {
    method: "PUT",
    body: JSON.stringify({ ids }),
  });

export interface HasilBuatKlip {
  dibuat: number;
  sudahAda: number;
  dilewati: string[];
  kuotaHabis: boolean;
  perkiraanBiayaUsd: number;
}

export const buatKlip = (projectId: string) =>
  fetcher<HasilBuatKlip>(`${dasar(projectId)}/klip`, { method: "POST" });

export const urlFrame = (projectId: string, titikId: string, diperbaruiMs: number) =>
  `${dasar(projectId)}/berkas/frame/${titikId}?v=${diperbaruiMs}`;

export const urlKlip = (projectId: string, klipId: string) =>
  `${dasar(projectId)}/berkas/klip/${klipId}`;
