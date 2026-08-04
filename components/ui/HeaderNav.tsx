import Link from "next/link";
import { Box, LogOut } from "lucide-react";
import { signOut } from "@/auth";

export default function HeaderNav({
  nama,
  peran,
  beranda,
}: {
  nama: string;
  peran: string;
  beranda: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href={beranda} className="flex items-center gap-2 font-display font-bold">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-white">
            <Box size={17} strokeWidth={2.2} aria-hidden />
          </span>
          <span className="text-foreground">Rancang</span>
          <span className="hidden font-sans text-sm font-normal text-muted sm:inline">
            · Maket 3D
          </span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted">
            {nama}{" "}
            <span className="rounded border border-line px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-muted">
              {peran}
            </span>
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/masuk" });
            }}
          >
            <button className="flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 font-medium text-muted transition-colors duration-200 hover:border-rose-200 hover:bg-rose-50 hover:text-danger">
              <LogOut size={14} aria-hidden />
              Keluar
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
