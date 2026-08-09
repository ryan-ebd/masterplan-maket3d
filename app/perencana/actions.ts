"use server";

import { revalidatePath } from "next/cache";
import { HttpError } from "@/lib/authz";
import * as projects from "@/lib/projects";

// Form action tanpa penanganan error di UI: tolakan authz/status (mis. proyek
// keburu diklaim perencana lain) cukup di-refresh, jangan meledakkan halaman.
function abaikanTolakan(e: unknown) {
  if (!(e instanceof HttpError)) throw e;
}

export async function claimProject(projectId: string) {
  try {
    await projects.claimProject(projectId);
  } catch (e) {
    abaikanTolakan(e);
  }
  revalidatePath("/perencana");
}

export async function publishProject(projectId: string) {
  try {
    await projects.publishProject(projectId);
  } catch (e) {
    abaikanTolakan(e);
  }
  revalidatePath(`/perencana/proyek/${projectId}`);
  revalidatePath("/perencana");
}
