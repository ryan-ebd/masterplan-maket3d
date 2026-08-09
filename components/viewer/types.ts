// LayerMeta didefinisikan pipeline (produser) — type-only import, aman utk bundle client.
export type { LayerMeta } from "@/lib/pipeline/types";

/** Mode alas peta di viewer: papan polos, citra satelit, atau roadmap. */
export type ModeBasemap = "off" | "satelit" | "peta";

export interface InfoBangunan {
  heightM: number;
  heightSource: string;
  osmId?: string | number;
}
