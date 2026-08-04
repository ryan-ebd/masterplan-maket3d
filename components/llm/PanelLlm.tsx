"use client";

import { useRef, useState } from "react";
import type { Polygon } from "geojson";
import { Bot, Loader2, Send, Wand2 } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/Button";
import type { LngLat } from "@/lib/geo";
import GelembungPesan, { type Pesan } from "./GelembungPesan";

interface SuggestResp {
  polygon: Polygon;
  reasoning: string;
  suggested_zones: { name: string; type: string }[];
  assumptions: string[];
  areaM2: number;
}

interface ChatResp {
  teks: string;
  boundaryDraft: { polygon: Polygon; areaM2: number; reasoning: string } | null;
}

export default function PanelLlm({
  projectId,
  onBoundaryDraft,
}: {
  projectId: string;
  onBoundaryDraft: (ring: LngLat[], note: string) => void;
}) {
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [instruksi, setInstruksi] = useState("");
  const [chat, setChat] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function push(p: Pesan) {
    setPesan((arr) => [...arr, p]);
    setTimeout(() => scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
  }

  async function usulkan() {
    setLoading(true);
    push({
      peran: "user",
      teks: instruksi.trim() ? `Usulkan batas: ${instruksi.trim()}` : "Usulkan batas wilayah otomatis",
    });
    try {
      const data = await fetcher<SuggestResp>(`/api/projects/${projectId}/llm/suggest-boundary`, {
        method: "POST",
        body: JSON.stringify({ instruction: instruksi.trim() || undefined }),
      });
      onBoundaryDraft(data.polygon.coordinates[0] as LngLat[], data.reasoning);
      const zona =
        data.suggested_zones.length > 0
          ? `\n\nZona: ${data.suggested_zones.map((z) => `${z.name} (${z.type})`).join(", ")}`
          : "";
      push({
        peran: "asisten",
        teks: `${data.reasoning}${zona}\n\nLuas ≈ ${(data.areaM2 / 1e6).toFixed(3)} km² — poligon dimuat ke editor.`,
      });
      setInstruksi("");
    } catch (e) {
      push({ peran: "error", teks: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  async function kirimChat(e: React.FormEvent) {
    e.preventDefault();
    const isi = chat.trim();
    if (!isi) return;
    setChat("");
    push({ peran: "user", teks: isi });
    setLoading(true);
    try {
      const data = await fetcher<ChatResp>(`/api/projects/${projectId}/llm/chat`, {
        method: "POST",
        body: JSON.stringify({ message: isi }),
      });
      push({ peran: "asisten", teks: data.teks });
      if (data.boundaryDraft) {
        onBoundaryDraft(
          data.boundaryDraft.polygon.coordinates[0] as LngLat[],
          data.boundaryDraft.reasoning,
        );
        push({ peran: "asisten", teks: "Poligon revisi dimuat ke editor." });
      }
    } catch (err) {
      push({ peran: "error", teks: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[560px] flex-col rounded-lg border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary text-white">
          <Bot size={18} aria-hidden />
        </span>
        <div>
          <h2 className="font-display font-semibold">Asisten Perencana</h2>
          <p className="text-xs text-muted">Usulan AI selalu berupa draf yang bisa Anda edit</p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5 rounded-md border border-line bg-background p-3.5">
        <label htmlFor="instruksi-llm" className="sr-only">
          Instruksi untuk asisten
        </label>
        <input
          id="instruksi-llm"
          value={instruksi}
          onChange={(e) => setInstruksi(e.target.value)}
          placeholder='Instruksi opsional, mis. "ikuti jalan besar ± 500 m"'
          className="min-h-11 w-full rounded-md border border-line bg-surface px-3.5 text-sm transition-colors duration-200 focus:border-primary focus:outline-none"
          disabled={loading}
        />
        <Button onClick={usulkan} disabled={loading} className="w-full py-2.5">
          <Wand2 size={17} aria-hidden />
          Usulkan Batas Otomatis
        </Button>
      </div>

      <div ref={scrollRef} className="mt-4 flex-1 space-y-2.5 overflow-y-auto pr-1">
        {pesan.length === 0 && (
          <div className="pt-10 text-center">
            <p className="text-sm text-muted">Minta usulan batas, atau ajak diskusi:</p>
            <p className="mt-1.5 inline-block rounded-md border border-line px-3 py-1 font-mono text-xs text-muted">
              “perluas ke utara sampai sungai”
            </p>
          </div>
        )}
        {pesan.map((p, i) => (
          <GelembungPesan key={i} pesan={p} />
        ))}
        {loading && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 size={14} className="animate-spin" aria-hidden />
            Claude sedang menganalisis…
          </p>
        )}
      </div>

      <form onSubmit={kirimChat} className="mt-4 flex gap-2">
        <label htmlFor="chat-llm" className="sr-only">
          Pesan revisi
        </label>
        <input
          id="chat-llm"
          value={chat}
          onChange={(e) => setChat(e.target.value)}
          placeholder="Tulis pesan revisi…"
          className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-surface px-3.5 text-sm transition-colors duration-200 focus:border-primary focus:outline-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !chat.trim()}
          aria-label="Kirim pesan"
          className="flex size-11 cursor-pointer items-center justify-center rounded-md bg-primary text-white transition-all duration-200 hover:bg-primary-dark active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={17} aria-hidden />
        </button>
      </form>
    </div>
  );
}
