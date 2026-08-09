import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, Inbox, UserRound } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import BadgeStatus from "@/components/ui/BadgeStatus";
import { Button } from "@/components/ui/Button";
import { cardCls } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LokasiProyek } from "@/components/ui/LokasiProyek";
import { claimProject } from "./actions";

// Hanya kolom yang dirender kartu — boundary/zonesMeta JSON tidak ikut terangkut
const KARTU_SELECT = {
  id: true,
  name: true,
  status: true,
  address: true,
  locationLat: true,
  locationLng: true,
  createdAt: true,
  klien: { select: { name: true } },
} as const;

export default async function DashboardPerencana() {
  const session = await auth();
  const [masuk, milikku] = await Promise.all([
    prisma.project.findMany({
      where: { status: "BARU" },
      orderBy: { createdAt: "asc" },
      select: KARTU_SELECT,
    }),
    prisma.project.findMany({
      where: { perencanaId: session!.user.id },
      orderBy: { updatedAt: "desc" },
      select: KARTU_SELECT,
    }),
  ]);

  return (
    <div className="space-y-10">
      <section>
        <Eyebrow className="mb-3">Dasbor Perencana</Eyebrow>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-primary text-white">
            <Inbox size={19} aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold">Proyek Masuk</h1>
            <p className="text-sm text-muted">
              {masuk.length > 0 ? `${masuk.length} proyek menunggu diklaim` : "Semua sudah ditangani"}
            </p>
          </div>
        </div>
        {masuk.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
            Tidak ada proyek baru yang menunggu.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {masuk.map((p) => (
              <div key={p.id} className={cardCls(true)}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display font-semibold">{p.name}</h2>
                  <BadgeStatus status={p.status} />
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                  <LokasiProyek address={p.address} lat={p.locationLat} lng={p.locationLng} clamp />
                </p>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                  <UserRound size={13} aria-hidden />
                  {p.klien.name} ·{" "}
                  {p.createdAt.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                </p>
                <form action={claimProject.bind(null, p.id)} className="mt-4">
                  <Button className="w-full py-2.5">
                    <ClipboardCheck size={17} aria-hidden />
                    Klaim Proyek
                  </Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-5 font-display text-2xl font-bold">Proyek Saya</h2>
        {milikku.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
            Belum ada proyek yang Anda tangani — klaim dari daftar di atas.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {milikku.map((p) => (
              <Link
                key={p.id}
                href={`/perencana/proyek/${p.id}`}
                className={cardCls(true, "group")}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display font-semibold group-hover:text-primary">{p.name}</h3>
                  <BadgeStatus status={p.status} />
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                  <LokasiProyek address={p.address} lat={p.locationLat} lng={p.locationLng} clamp />
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <UserRound size={13} aria-hidden />
                    {p.klien.name}
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
      </section>
    </div>
  );
}
