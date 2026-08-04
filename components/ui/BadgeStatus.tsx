import type { ProjectStatus } from "@prisma/client";

const KONFIG: Record<ProjectStatus, { label: string; cls: string; dot: string }> = {
  BARU: { label: "Baru", cls: "bg-blue-50 text-accent ring-blue-200", dot: "bg-accent" },
  DIPROSES: {
    label: "Diproses Perencana",
    cls: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-warm",
  },
  GENERATING: {
    label: "Membangun Maket",
    cls: "bg-primary/10 text-primary ring-primary/25",
    dot: "bg-primary animate-pulse",
  },
  REVIEW_PERENCANA: {
    label: "Review Perencana",
    cls: "bg-wood/15 text-wood-deep ring-wood/40",
    dot: "bg-wood",
  },
  SELESAI: {
    label: "Selesai",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  GAGAL: { label: "Gagal", cls: "bg-rose-50 text-danger ring-rose-200", dot: "bg-danger" },
};

export default function BadgeStatus({ status }: { status: ProjectStatus }) {
  const k = KONFIG[status] ?? {
    label: status,
    cls: "bg-line/50 text-muted ring-line",
    dot: "bg-muted",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[11px] uppercase tracking-wide ring-1 ${k.cls}`}
    >
      <span className={`size-1.5 rounded-full ${k.dot}`} aria-hidden />
      {k.label}
    </span>
  );
}
