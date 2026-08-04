"use client";

import { AlertCircle } from "lucide-react";

export interface Pesan {
  peran: "user" | "asisten" | "error";
  teks: string;
}

export default function GelembungPesan({ pesan }: { pesan: Pesan }) {
  if (pesan.peran === "error") {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-md bg-rose-50 px-3.5 py-2.5 text-sm text-danger"
      >
        <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
        {pesan.teks}
      </div>
    );
  }
  const user = pesan.peran === "user";
  return (
    <div className={`flex ${user ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
          user
            ? "rounded-br-sm bg-primary text-white"
            : "rounded-bl-sm border border-line bg-background text-foreground"
        }`}
      >
        {pesan.teks}
      </div>
    </div>
  );
}
