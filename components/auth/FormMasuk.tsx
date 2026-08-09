"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";

export default function FormMasuk() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lihatSandi, setLihatSandi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Email atau kata sandi salah. Periksa kembali lalu coba lagi.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="anda@contoh.id"
        />
      </div>
      <div>
        <Label htmlFor="sandi">Kata sandi</Label>
        <div className="relative">
          <Input
            id="sandi"
            type={lihatSandi ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-12"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setLihatSandi((v) => !v)}
            aria-label={lihatSandi ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-200 hover:text-primary"
          >
            {lihatSandi ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
          </button>
        </div>
      </div>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 size={17} className="animate-spin" aria-hidden />
            Memproses…
          </>
        ) : (
          <>
            Masuk
            <ArrowRight size={17} aria-hidden />
          </>
        )}
      </Button>
    </form>
  );
}
