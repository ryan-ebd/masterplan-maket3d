import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const VARIAN = {
  error: { Icon: AlertCircle, cls: "bg-rose-50 text-danger", role: "alert" as const },
  sukses: { Icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700", role: undefined },
};

/** Banner pesan error (rose) / sukses (emerald) seragam. */
export function Alert({
  varian = "error",
  className = "",
  children,
}: {
  varian?: keyof typeof VARIAN;
  className?: string;
  children: ReactNode;
}) {
  const { Icon, cls, role } = VARIAN[varian];
  return (
    <p
      role={role}
      className={`flex items-start gap-2 rounded-md px-3.5 py-2.5 text-sm ${cls} ${className}`.trim()}
    >
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
