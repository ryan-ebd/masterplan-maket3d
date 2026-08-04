import Link from "next/link";
import { ArrowUpRight, Boxes, MapPin, Plus } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import BadgeStatus from "@/components/ui/BadgeStatus";
import { btnCls } from "@/components/ui/Button";
import { cardCls } from "@/components/ui/Card";
import { Eyebrow, formatKoordinat } from "@/components/ui/Eyebrow";
import { GarisKontur } from "@/components/ui/GarisKontur";

export default async function DashboardKlien() {
  const session = await auth();
  const projects = await prisma.project.findMany({
    where: { klienId: session!.user.id },
    orderBy: { updatedAt: "desc" },
    include: { perencana: { select: { name: true } } },
  });

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Eyebrow className="mb-2">Dasbor Klien</Eyebrow>
          <h1 className="font-display text-3xl font-bold">Proyek Saya</h1>
          <p className="mt-1 text-sm text-muted">
            {projects.length > 0
              ? `${projects.length} proyek maket 3D`
              : "Mulai dengan menandai titik lokasi di peta"}
          </p>
        </div>
        <Link href="/klien/proyek/baru" className={btnCls("primary", "py-2.5")}>
          <Plus size={18} aria-hidden />
          Proyek Baru
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="relative overflow-hidden rounded-lg border border-dashed border-line bg-surface p-12 text-center">
          <GarisKontur className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 text-line" />
          <div className="relative">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-md bg-primary text-white">
              <Boxes size={24} aria-hidden />
            </div>
            <p className="font-display text-lg font-semibold">Belum ada proyek</p>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted">
              Buat proyek pertama Anda: tentukan titik lokasi di peta, dan perencana kami akan
              menyusun maket 3D-nya.
            </p>
            <Link href="/klien/proyek/baru" className={btnCls("primary", "mt-6 py-2.5")}>
              <Plus size={18} aria-hidden />
              Buat Proyek Pertama
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/klien/proyek/${p.id}`}
              className={cardCls(true, "group")}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display font-semibold group-hover:text-primary">{p.name}</h2>
                <BadgeStatus status={p.status} />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                <MapPin size={14} className="shrink-0 text-primary" aria-hidden />
                <span className="line-clamp-1">
                  {p.address ?? (
                    <span className="font-mono text-xs">
                      {formatKoordinat(p.locationLat, p.locationLng)}
                    </span>
                  )}
                </span>
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
                <span>
                  {p.perencana ? `Perencana: ${p.perencana.name}` : "Menunggu perencana"} ·{" "}
                  {p.updatedAt.toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <ArrowUpRight
                  size={15}
                  className="text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  aria-hidden
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
