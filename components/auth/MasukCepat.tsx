"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, MapPin, PencilRuler } from "lucide-react";
import { Alert } from "@/components/ui/Alert";

const AKUN = [
  { email: "klien@demo.id", label: "Masuk sebagai Klien", Icon: MapPin },
  { email: "perencana@demo.id", label: "Masuk sebagai Perencana", Icon: PencilRuler },
] as const;

/**
 * Tombol login sekali-klik untuk akun demo — hanya dirender saat development
 * (di-gate NODE_ENV oleh halaman /masuk, komponen ini tidak mengeceknya sendiri).
 */
export default function MasukCepat() {
  const router = useRouter();
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function masuk(email: string) {
    setError(null);
    setSibuk(email);
    const res = await signIn("credentials", { email, password: "password123", redirect: false });
    setSibuk(null);
    if (res?.error) {
      setError("Login demo gagal — pastikan database sudah di-seed (npm run seed).");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mt-6 rounded-md border border-line bg-background p-3">
      <p className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
        Login cepat (dev)
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {AKUN.map(({ email, label, Icon }) => (
          <button
            key={email}
            type="button"
            onClick={() => masuk(email)}
            disabled={sibuk !== null}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-foreground/25 bg-surface px-3 text-sm font-semibold text-foreground transition-colors duration-200 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
          >
            {sibuk === email ? (
              <Loader2 size={15} className="animate-spin" aria-hidden />
            ) : (
              <Icon size={15} aria-hidden />
            )}
            {label}
          </button>
        ))}
      </div>
      <p className="mt-2 font-mono text-xs text-muted">
        klien@demo.id · perencana@demo.id · sandi: password123
      </p>
      {error && (
        <div className="mt-2">
          <Alert>{error}</Alert>
        </div>
      )}
    </div>
  );
}
