import Link from "next/link";
import { Box } from "lucide-react";
import FormDaftar from "@/components/auth/FormDaftar";
import { GarisKontur } from "@/components/ui/GarisKontur";

export default function HalamanDaftar() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-10">
      <GarisKontur className="pointer-events-none absolute -left-44 -top-40 h-[560px] w-[560px] text-primary/10" />
      <GarisKontur className="pointer-events-none absolute -bottom-48 -right-40 h-[460px] w-[460px] text-wood/20" />
      <div className="relative w-full max-w-md rounded-lg border border-line bg-surface p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-md bg-primary text-white">
            <Box size={22} strokeWidth={2.2} aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold">Daftar</h1>
            <p className="text-sm text-muted">
              Klien (pemilik proyek) atau Perencana (pemroses maket)
            </p>
          </div>
        </div>
        <FormDaftar />
        <p className="mt-5 text-center text-sm text-muted">
          Sudah punya akun?{" "}
          <Link href="/masuk" className="font-semibold text-primary hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </main>
  );
}
