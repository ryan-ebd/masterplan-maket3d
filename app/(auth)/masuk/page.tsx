import Link from "next/link";
import { Box } from "lucide-react";
import FormMasuk from "@/components/auth/FormMasuk";
import MasukCepat from "@/components/auth/MasukCepat";
import { GarisKontur } from "@/components/ui/GarisKontur";

export default function HalamanMasuk() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      <GarisKontur className="pointer-events-none absolute -left-44 -top-40 h-[560px] w-[560px] text-primary/10" />
      <GarisKontur className="pointer-events-none absolute -bottom-48 -right-40 h-[460px] w-[460px] text-wood/20" />
      <div className="relative w-full max-w-md rounded-lg border border-line bg-surface p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-md bg-primary text-white">
            <Box size={22} strokeWidth={2.2} aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold">Masuk</h1>
            <p className="text-sm text-muted">Rancang — Generator Maket 3D</p>
          </div>
        </div>
        <FormMasuk />
        <p className="mt-5 text-center text-sm text-muted">
          Belum punya akun?{" "}
          <Link href="/daftar" className="font-semibold text-primary hover:underline">
            Daftar
          </Link>
        </p>
        {process.env.NODE_ENV !== "production" && <MasukCepat />}
      </div>
    </main>
  );
}
