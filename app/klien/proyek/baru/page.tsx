import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FormProyekBaru from "@/components/klien/FormProyekBaru";

export default function HalamanProyekBaru() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/klien"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors duration-200 hover:text-primary"
      >
        <ArrowLeft size={15} aria-hidden />
        Kembali ke daftar proyek
      </Link>
      <h1 className="font-display text-3xl font-bold">Proyek Baru</h1>
      <p className="mb-7 mt-1 text-sm text-muted">
        Tandai titik lokasi maket — perencana akan menyusun batas wilayahnya bersama Anda.
      </p>
      <div className="rounded-lg border border-line bg-surface p-6 shadow-sm">
        <FormProyekBaru />
      </div>
    </div>
  );
}
