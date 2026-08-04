import type { ButtonHTMLAttributes } from "react";

type VarianTombol = "primary" | "secondary" | "ghost";

const dasar =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45";

const varian: Record<VarianTombol, string> = {
  primary: "min-h-11 bg-primary px-5 text-white hover:bg-primary-dark active:scale-[0.98]",
  secondary:
    "min-h-11 border border-foreground/25 bg-surface px-5 text-foreground hover:border-primary hover:text-primary",
  ghost: "px-2 py-1 text-muted hover:text-primary",
};

/** Class string tombol — dipakai di <button> maupun <Link>. */
export function btnCls(v: VarianTombol = "primary", extra = "") {
  return `${dasar} ${varian[v]} ${extra}`.trim();
}

type PropsButton = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: VarianTombol };

export function Button({ variant = "primary", className = "", ...props }: PropsButton) {
  return <button className={btnCls(variant, className)} {...props} />;
}
