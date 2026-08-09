import { MapPin } from "lucide-react";
import { formatKoordinat } from "./Eyebrow";

/** Baris lokasi proyek: alamat, atau koordinat monospace bila alamat belum ada. */
export function LokasiProyek({
  address,
  lat,
  lng,
  clamp = false,
}: {
  address: string | null;
  lat: number;
  lng: number;
  clamp?: boolean;
}) {
  const isi = address ?? (
    <span className="font-mono text-xs">{formatKoordinat(lat, lng)}</span>
  );
  return (
    <>
      <MapPin size={14} className="shrink-0 text-primary" aria-hidden />
      {clamp ? <span className="line-clamp-1">{isi}</span> : isi}
    </>
  );
}
