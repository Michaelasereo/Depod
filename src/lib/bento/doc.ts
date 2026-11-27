import type { StarterLayout, Tile } from "./layout";

/** What we store in bentos.layout. */
export type BentoDoc = { v: 1; seed: number; tiles: Tile[] };

export const emptyDoc = (): BentoDoc => ({ v: 1, seed: 1, tiles: [] });

export function parseDoc(raw: unknown): BentoDoc {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && (raw as BentoDoc).v === 1) {
    const d = raw as BentoDoc;
    return { v: 1, seed: Number(d.seed) || 1, tiles: Array.isArray(d.tiles) ? d.tiles : [] };
  }
  return emptyDoc();
}

export const STARTERS: Array<{ id: StarterLayout; label: string }> = [
  { id: "hero-left", label: "Hero left" },
  { id: "hero-top", label: "Hero top" },
  { id: "even-grid", label: "Even grid" },
  { id: "mosaic", label: "Mosaic" },
];
