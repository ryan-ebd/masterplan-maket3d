"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { AlertCircle, Boxes, Check, Loader2, MapPin } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/Button";
import { formatKoordinat } from "@/components/ui/Eyebrow";
import { Input, Label, Textarea } from "@/components/ui/Field";
import PenyediaPeta from "@/components/peta/PenyediaPeta";
import PickerTitik from "@/components/peta/PickerTitik";

interface FormNilai {
  name: string;
  description: string;
}

export default function FormProyekBaru() {
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<FormNilai>();
  const [titik, setTitik] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(v: FormNilai) {
    if (!titik) return;
    setError(null);
    setLoading(true);
    try {
      const proyek = await fetcher<{ id: string }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: v.name,
          description: v.description || undefined,
          lat: titik.lat,
          lng: titik.lng,
        }),
      });
      router.push(`/klien/proyek/${proyek.id}`);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <Label htmlFor="nama-proyek">Nama proyek</Label>
        <Input
          id="nama-proyek"
          {...register("name", { required: true, minLength: 3 })}
          placeholder="mis. Maket Kawasan Braga"
          aria-invalid={!!formState.errors.name}
        />
        {formState.errors.name && (
          <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-danger">
            <AlertCircle size={13} aria-hidden />
            Nama minimal 3 karakter
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="deskripsi">
          Deskripsi <span className="font-normal text-muted">(opsional)</span>
        </Label>
        <Textarea
          id="deskripsi"
          {...register("description")}
          rows={3}
          placeholder="Ceritakan kebutuhan maket Anda…"
        />
      </div>
      <div>
        <span className="mb-1.5 block text-sm font-semibold">
          Titik lokasi <span className="font-normal text-muted">(klik peta atau geser penanda)</span>
        </span>
        <PenyediaPeta>
          <PickerTitik value={titik} onChange={setTitik} />
        </PenyediaPeta>
        {titik ? (
          <p className="mt-2 flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            <Check size={14} aria-hidden />
            Titik dipilih: <span className="font-mono">{formatKoordinat(titik.lat, titik.lng)}</span>
          </p>
        ) : (
          <p className="mt-2 flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            <MapPin size={14} aria-hidden />
            Klik peta untuk menandai titik lokasi
          </p>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md bg-rose-50 px-3.5 py-2.5 text-sm text-danger"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading || !titik} className="px-6 py-2.5">
        {loading ? (
          <>
            <Loader2 size={17} className="animate-spin" aria-hidden />
            Membuat…
          </>
        ) : (
          <>
            <Boxes size={17} aria-hidden />
            Buat Proyek
          </>
        )}
      </Button>
    </form>
  );
}
