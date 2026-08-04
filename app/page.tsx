import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, Boxes, MapPin, MousePointerClick, UserRound } from "lucide-react";
import { auth } from "@/auth";
import { btnCls } from "@/components/ui/Button";
import { cardCls } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { GarisKontur } from "@/components/ui/GarisKontur";

const LANGKAH = [
  {
    icon: MapPin,
    judul: "Tandai Titik",
    isi: "Klien memilih lokasi maket cukup dengan satu klik di Google Maps.",
  },
  {
    icon: Bot,
    judul: "Batas Dibantu AI",
    isi: "Perencana menyusun poligon batas wilayah bersama Claude — mengikuti jalan, sungai, dan blok kota nyata.",
  },
  {
    icon: Boxes,
    judul: "Maket 3D Instan",
    isi: "Bangunan, jalan, air, dan terrain dari data OpenStreetMap dirakit menjadi maket 3D interaktif.",
  },
];

export default async function Beranda() {
  const session = await auth();
  if (session?.user) {
    redirect(session.user.role === "KLIEN" ? "/klien" : "/perencana");
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <GarisKontur className="pointer-events-none absolute -right-40 -top-32 h-[620px] w-[620px] text-primary/10" />
      <GarisKontur className="pointer-events-none absolute -bottom-56 -left-48 h-[520px] w-[520px] text-wood/20" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-16">
        <Eyebrow coords={{ lat: -6.9147, lng: 107.6098 }} className="mb-6">
          Rancang · Generator Maket Kota
        </Eyebrow>
        <h1 className="max-w-3xl text-center font-display text-4xl font-bold tracking-tight sm:text-6xl">
          Generator Maket 3D <span className="text-primary">Berbasis Lokasi Peta</span>
        </h1>
        <p className="mt-6 max-w-2xl text-center text-lg leading-relaxed text-muted">
          Dari satu titik di peta menjadi maket tiga dimensi lengkap — bangunan, jalan, air, dan
          terrain — siap dijelajahi langsung di browser.
        </p>
        <div className="mt-9 flex items-center gap-4">
          <Link href="/masuk" className={btnCls("primary", "px-7 py-3 text-base")}>
            <MousePointerClick size={18} aria-hidden />
            Masuk
          </Link>
          <Link href="/daftar" className={btnCls("secondary", "px-7 py-3 text-base")}>
            <UserRound size={17} aria-hidden />
            Daftar
          </Link>
        </div>

        <div className="mt-16 grid w-full gap-5 sm:grid-cols-3">
          {LANGKAH.map((l, i) => (
            <div key={l.judul} className={cardCls(true, "p-6")}>
              <div className="mb-4 flex size-11 items-center justify-center rounded-md bg-primary text-white">
                <l.icon size={21} aria-hidden />
              </div>
              <p className="mb-1 font-mono text-[11px] tracking-[0.18em] text-wood-deep">
                0{i + 1}
              </p>
              <h2 className="font-display text-lg font-semibold">{l.judul}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{l.isi}</p>
            </div>
          ))}
        </div>
      </div>
      <footer className="relative pb-6 text-center font-mono text-xs text-muted">
        Data peta © OpenStreetMap contributors · Peta © Google
      </footer>
    </main>
  );
}
