import type { ReactNode } from "react";

/** Format koordinat gaya label survei: −6.9147 / 107.6098 (minus tipografis). */
export function formatKoordinat(lat: number, lng: number) {
  const f = (n: number) => `${n < 0 ? "−" : ""}${Math.abs(n).toFixed(4)}`;
  return `${f(lat)} / ${f(lng)}`;
}

type PropsEyebrow = {
  children: ReactNode;
  coords?: { lat: number; lng: number };
  className?: string;
};

/** Label seksi monospace — pengganti pill generik; koordinat opsional sebagai penanda lokasi. */
export function Eyebrow({ children, coords, className = "" }: PropsEyebrow) {
  return (
    <p
      className={`font-mono text-xs uppercase tracking-[0.18em] text-primary ${className}`.trim()}
    >
      {children}
      {coords && (
        <span className="ml-3 text-muted">{formatKoordinat(coords.lat, coords.lng)}</span>
      )}
    </p>
  );
}
