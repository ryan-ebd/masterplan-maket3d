import type { HTMLAttributes } from "react";

/** Class string kartu — dipakai di <div> maupun <Link>. */
export function cardCls(hover = false, extra = "") {
  const dasar = "rounded-lg border border-line bg-surface p-5 shadow-sm";
  const efek = hover
    ? " transition-all hover:-translate-y-px hover:border-primary hover:shadow-md"
    : "";
  return `${dasar}${efek} ${extra}`.trim();
}

type PropsCard = HTMLAttributes<HTMLDivElement> & { hover?: boolean };

export function Card({ hover = false, className = "", ...props }: PropsCard) {
  return <div className={cardCls(hover, className)} {...props} />;
}
