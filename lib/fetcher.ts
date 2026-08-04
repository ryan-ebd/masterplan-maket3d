interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; fields?: Record<string, string[]> };
}

/** Fetch + parse amplop API seragam {ok,data}/{ok:false,error}; lempar Error bila gagal. */
export async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
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
