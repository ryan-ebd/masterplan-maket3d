import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ZodError } from "zod";
import type { ProjectStatus, Role } from "@prisma/client";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || !u.role) throw new HttpError(401, "Belum masuk");
  return { id: u.id, email: u.email ?? "", name: u.name ?? "", role: u.role };
}

export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== role) throw new HttpError(403, "Peran tidak diizinkan untuk aksi ini");
  return user;
}

/** Beranda per peran — satu-satunya pemetaan peran -> route. */
export function homeForRole(role: Role): string {
  return role === "KLIEN" ? "/klien" : "/perencana";
}

/** Status yang masih boleh diubah perencana (boundary/generate/LLM). */
export const EDITABLE_STATUSES: ReadonlySet<ProjectStatus> = new Set<ProjectStatus>([
  "DIPROSES",
  "REVIEW_PERENCANA",
  "GAGAL",
]);

/**
 * Akses BACA: KLIEN hanya proyek miliknya; PERENCANA proyek yang ia tangani
 * atau yang masih BARU (agar bisa dilihat sebelum diklaim); ADMIN semua.
 */
export async function assertProjectAccess(projectId: string, user?: SessionUser) {
  const u = user ?? (await requireUser());
  // select sempit: guard ini ada di jalur polling — jangan tarik boundary/zonesMeta JSON
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, klienId: true, perencanaId: true, status: true },
  });
  if (!project) throw new HttpError(404, "Proyek tidak ditemukan");

  if (u.role === "KLIEN" && project.klienId !== u.id) {
    throw new HttpError(403, "Bukan proyek Anda");
  }
  if (u.role === "PERENCANA" && project.perencanaId !== u.id && project.status !== "BARU") {
    throw new HttpError(403, "Proyek ini ditangani perencana lain");
  }
  return { user: u, project };
}

/**
 * Akses TULIS perencana (boundary/generate/publish/LLM): wajib perencana
 * yang sudah mengklaim proyek ini. Tanpa ini, perencana mana pun bisa
 * menimpa pekerjaan perencana lain (IDOR).
 */
export async function assertProjectAssigned(projectId: string, user?: SessionUser) {
  const u = user ?? (await requireRole("PERENCANA"));
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new HttpError(404, "Proyek tidak ditemukan");
  if (u.role !== "ADMIN" && project.perencanaId !== u.id) {
    throw new HttpError(403, "Klaim proyek ini dulu sebelum mengubahnya");
  }
  return { user: u, project };
}

/**
 * Guard lengkap route TULIS perencana: assigned + status masih editable.
 * `aksi` dipakai di pesan 409, mis. "Ubah batas" / "Generate".
 */
export async function assertProjectEditable(projectId: string, aksi: string) {
  const { user, project } = await assertProjectAssigned(projectId);
  if (!EDITABLE_STATUSES.has(project.status)) {
    throw new HttpError(409, `${aksi} tidak bisa dilakukan saat status ${project.status}`);
  }
  return { user, project };
}

export function jsonOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ ok: true, data }, init);
}

export function handleApiError(e: unknown): Response {
  if (e instanceof ZodError) {
    return Response.json(
      { ok: false, error: { code: "VALIDATION", message: "Data tidak valid", fields: e.flatten().fieldErrors } },
      { status: 422 },
    );
  }
  if (e instanceof HttpError) {
    return Response.json({ ok: false, error: { code: "HTTP", message: e.message } }, { status: e.status });
  }
  console.error("[api] unexpected error:", e);
  return Response.json(
    { ok: false, error: { code: "INTERNAL", message: "Terjadi kesalahan di server" } },
    { status: 500 },
  );
}
