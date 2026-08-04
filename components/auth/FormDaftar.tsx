"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, ArrowRight, DraftingCompass, Loader2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";

const PERAN = [
  { nilai: "KLIEN", label: "Klien", icon: UserRound, isi: "Pemilik proyek" },
  { nilai: "PERENCANA", label: "Perencana", icon: DraftingCompass, isi: "Pemroses maket" },
] as const;

export default function FormDaftar() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "KLIEN" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body?.error?.message ?? "Pendaftaran gagal");
      const login = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (login?.error) {
        throw new Error("Akun dibuat, tapi gagal masuk otomatis — silakan masuk manual.");
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="nama">Nama</Label>
        <Input
          id="nama"
          autoComplete="name"
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Nama lengkap"
        />
      </div>
      <div>
        <Label htmlFor="email-daftar">Email</Label>
        <Input
          id="email-daftar"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="anda@contoh.id"
        />
      </div>
      <div>
        <Label htmlFor="sandi-daftar">Kata sandi</Label>
        <Input
          id="sandi-daftar"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          placeholder="••••••••"
          aria-describedby="bantuan-sandi"
        />
        <p id="bantuan-sandi" className="mt-1.5 text-xs text-muted">
          Minimal 6 karakter.
        </p>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Peran (demo)</legend>
        <div className="grid grid-cols-2 gap-2.5">
          {PERAN.map((r) => {
            const aktif = form.role === r.nilai;
            return (
              <button
                key={r.nilai}
                type="button"
                aria-pressed={aktif}
                onClick={() => set("role", r.nilai)}
                className={`flex min-h-11 cursor-pointer flex-col items-start gap-0.5 rounded-md border px-3.5 py-2.5 text-left transition-all duration-200 ${
                  aktif
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-line bg-surface text-muted hover:border-primary/40 hover:bg-background"
                }`}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <r.icon size={15} aria-hidden />
                  {r.label}
                </span>
                <span className="text-xs text-muted">{r.isi}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md bg-rose-50 px-3.5 py-2.5 text-sm text-danger"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 size={17} className="animate-spin" aria-hidden />
            Memproses…
          </>
        ) : (
          <>
            Daftar
            <ArrowRight size={17} aria-hidden />
          </>
        )}
      </Button>
    </form>
  );
}
