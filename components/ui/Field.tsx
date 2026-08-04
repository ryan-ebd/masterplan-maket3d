import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/** Class string input — dipakai juga di elemen non-wrapper (mis. input di dalam grup). */
export const inputCls =
  "min-h-11 w-full rounded-md border border-line bg-surface px-3.5 text-base transition-colors focus:border-primary focus:outline-none";

export function Label({ className = "", ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`mb-1.5 block text-sm font-semibold ${className}`.trim()} {...props} />;
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputCls} ${className}`.trim()} {...props} />;
}

export function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputCls} py-2.5 ${className}`.trim()} {...props} />;
}
