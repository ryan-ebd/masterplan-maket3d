"use client";

import { Component, type ReactNode } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function BannerPeta({ pesan }: { pesan: ReactNode }) {
  return (
    <div className="flex h-full min-h-64 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-sm leading-relaxed text-amber-800">
      <div className="max-w-sm">{pesan}</div>
    </div>
  );
}

/**
 * Error boundary: kegagalan auth Maps (mis. RefererNotAllowedMapError) melempar
 * exception dari subtree peta — tanpa boundary ini SELURUH halaman workspace mati.
 */
class PetaErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const msg = String(this.state.error.message ?? this.state.error);
      const referer = msg.includes("RefererNotAllowed");
      return (
        <BannerPeta
          pesan={
            referer ? (
              <p>
                Key Maps ditolak untuk situs ini (<strong>RefererNotAllowedMapError</strong>).
                Tambahkan <code>http://localhost:3000/*</code> ke daftar HTTP referrer key
                browser di Google Cloud Console, lalu muat ulang.
              </p>
            ) : (
              <p>
                Peta gagal dimuat: <code>{msg.slice(0, 160)}</code>
              </p>
            )
          }
        />
      );
    }
    return this.props.children;
  }
}

export default function PenyediaPeta({ children }: { children: ReactNode }) {
  if (!API_KEY) {
    return (
      <BannerPeta
        pesan={
          <p>
            <strong>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</strong> belum diisi di <code>.env</code> —
            peta tidak bisa dirender. Isi key lalu restart server dev.
          </p>
        }
      />
    );
  }
  return (
    <PetaErrorBoundary>
      <APIProvider apiKey={API_KEY} language="id" region="ID">
        {children}
      </APIProvider>
    </PetaErrorBoundary>
  );
}
