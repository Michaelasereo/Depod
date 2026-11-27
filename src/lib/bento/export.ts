"use client";

import { bentoHeight, tileRect, type Tile } from "./layout";

/*
 * PNG export of the bento (Figma 15, 41a, 41b).
 * Sizes follow the Figma dialog: "1x" is twice the on-screen bento (1456 px wide), "2x" is four times (2912 px).
 * Images are drawn with object-fit: cover, like the tiles. Free plans always get the "Made with Depod" mark.
 */
const BENTO_W = 728;
const PAD = 12;
const GAP = 8;
const ROW_H = 196;
const RADIUS = 12;
const MAX_SIDE = 16384; // stay well inside browser canvas limits
export const LARGE_TILE_COUNT = 100;

export function exportSize(tiles: Tile[], size: 1 | 2) {
  const k = size * 2;
  const h = bentoHeight(tiles, { gap: GAP, rowHeight: ROW_H }) + PAD * 2;
  return { width: BENTO_W * k, height: Math.round(h * k) };
}

/** 41a: big bentos export at 1x only. */
export function forcedOneX(tiles: Tile[]) {
  return tiles.length > LARGE_TILE_COUNT || exportSize(tiles, 2).height > MAX_SIDE;
}

const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/** Loads every tile's image; returns the ones that failed (41b blocks the export until they're fixed). */
export async function checkImages(tiles: Tile[], urlOf: (id: string) => string | undefined) {
  const loaded = new Map<string, HTMLImageElement>();
  const missing: string[] = [];
  await Promise.all(
    tiles.map(async (t) => {
      const url = urlOf(t.imageId);
      if (!url) return void missing.push(t.imageId);
      try {
        loaded.set(t.imageId, await load(url));
      } catch {
        missing.push(t.imageId);
      }
    }),
  );
  return { loaded, missing };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export async function renderBento(
  tiles: Tile[],
  loaded: Map<string, HTMLImageElement>,
  opts: { size: 1 | 2; mark: boolean },
): Promise<Blob> {
  const k = opts.size * 2;
  const { width, height } = exportSize(tiles, opts.size);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(k, k);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, BENTO_W, height / k);
  ctx.imageSmoothingQuality = "high";

  for (const t of tiles) {
    const r = tileRect(t, { width: BENTO_W - PAD * 2, gap: GAP, rowHeight: ROW_H });
    const x = PAD + r.left;
    const y = PAD + r.top;
    const img = loaded.get(t.imageId);
    ctx.save();
    roundRect(ctx, x, y, r.width, r.height, RADIUS);
    ctx.clip();
    ctx.fillStyle = "#f2f2f2";
    ctx.fillRect(x, y, r.width, r.height);
    if (img) {
      // object-fit: cover
      const s = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight);
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      ctx.drawImage(img, x + (r.width - w) / 2, y + (r.height - h) / 2, w, h);
    }
    ctx.restore();
  }

  if (opts.mark) {
    const label = "Made with Depod";
    ctx.font = "500 11px Inter, system-ui, sans-serif";
    const tw = ctx.measureText(label).width;
    const pw = tw + 20;
    const ph = 24;
    const px = BENTO_W - PAD - 10 - pw;
    const py = height / k - PAD - 10 - ph;
    ctx.fillStyle = "rgba(10,10,10,0.85)";
    roundRect(ctx, px, py, pw, ph, 12);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(label, px + 10, py + ph / 2 + 0.5);
  }

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("export_failed"))), "image/png"));
}
