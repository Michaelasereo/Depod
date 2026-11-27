/*
 * Bento layout engine (PRD → Scope: starter layouts, auto-arrange, shuffle, locked tiles).
 *
 * The bento is a grid of `cols` columns and as many rows as it needs. Each image gets one tile
 * of 1×1 (small), 2×1 (wide), 1×2 (tall) or 2×2 (big) cells. Rules:
 * - Locked tiles keep their exact cells through shuffles and new images.
 * - Every image gets a tile; tiles never overlap; the grid has no holes.
 * - The starter layout picks the first shape; after that it re-arranges as images are added.
 * - Same input and seed → same layout, so a saved bento reloads exactly.
 * Pure TypeScript with no browser APIs, so it runs in tests, on the server and in the canvas.
 */

export type StarterLayout = "hero-left" | "hero-top" | "even-grid" | "mosaic";

export type BentoImage = {
  id: string;
  /** width / height */
  ratio: number;
};

export type Tile = {
  imageId: string;
  /** Column and row of the top-left cell, from 0. */
  x: number;
  y: number;
  /** Size in cells. */
  w: number;
  h: number;
  locked: boolean;
};

export type LayoutOptions = {
  starter: StarterLayout;
  /** Columns in the grid. Default 4. */
  cols?: number;
  /** Shuffle seed. Same seed, same layout. */
  seed?: number;
  /** Tiles from the saved layout; locked ones stay where they are. */
  previous?: Tile[];
};

export const DEFAULT_COLS = 4;

/** Small, fast, seeded random numbers (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Size = { w: number; h: number };
const SMALL: Size = { w: 1, h: 1 };
const WIDE: Size = { w: 2, h: 1 };
const TALL: Size = { w: 1, h: 2 };
const BIG: Size = { w: 2, h: 2 };

class Grid {
  private cells: Array<Array<string | null>> = [];
  constructor(readonly cols: number) {}

  private row(y: number) {
    while (this.cells.length <= y) this.cells.push(Array(this.cols).fill(null));
    return this.cells[y];
  }
  get rows() {
    // Rows that hold at least one tile.
    let last = -1;
    this.cells.forEach((r, y) => r.some(Boolean) && (last = y));
    return last + 1;
  }
  at(x: number, y: number) {
    return y < this.cells.length ? this.cells[y][x] : null;
  }
  fits(x: number, y: number, s: Size) {
    if (x < 0 || y < 0 || x + s.w > this.cols) return false;
    for (let dy = 0; dy < s.h; dy++) for (let dx = 0; dx < s.w; dx++) if (this.row(y + dy)[x + dx]) return false;
    return true;
  }
  put(id: string, x: number, y: number, s: Size) {
    for (let dy = 0; dy < s.h; dy++) for (let dx = 0; dx < s.w; dx++) this.row(y + dy)[x + dx] = id;
  }
  /** First free spot for a size, scanning row by row from the top. */
  firstFit(s: Size): { x: number; y: number } | null {
    for (let y = 0; y < this.cells.length + s.h + 1; y++) for (let x = 0; x + s.w <= this.cols; x++) if (this.fits(x, y, s)) return { x, y };
    return null;
  }
}

/** The shape an image prefers in the mosaic: landscape → wide, portrait → tall. */
function mosaicSize(img: BentoImage, r: () => number, bigLeft: number): Size {
  const roll = r();
  if (bigLeft > 0 && roll < 0.17) return BIG;
  if (roll < 0.5) {
    if (img.ratio >= 1.3) return WIDE;
    if (img.ratio <= 0.77) return TALL;
    return r() < 0.5 ? WIDE : TALL;
  }
  return SMALL;
}

/** Shuffles a copy of the list with the seeded random numbers. */
function shuffled<T>(list: T[], r: () => number) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function arrange(images: BentoImage[], opts: LayoutOptions): Tile[] {
  const cols = Math.max(2, opts.cols ?? DEFAULT_COLS);
  const r = rng(opts.seed ?? 1);
  const grid = new Grid(cols);
  const byId = new Map(images.map((i) => [i.id, i]));
  const tiles: Tile[] = [];

  // 1. Locked tiles keep their cells (if the image is still here and the cells are free).
  for (const t of opts.previous ?? []) {
    if (!t.locked || !byId.has(t.imageId)) continue;
    const s = { w: Math.min(t.w, cols), h: t.h };
    if (!grid.fits(t.x, t.y, s)) continue;
    grid.put(t.imageId, t.x, t.y, s);
    tiles.push({ ...t, ...s, locked: true });
  }
  const placed = new Set(tiles.map((t) => t.imageId));

  // 2. Everyone else, in a seeded order. Images already in the bento keep their relative order
  //    for the even grid, so adding an image doesn't scramble it.
  let free = images.filter((i) => !placed.has(i.id));
  if (opts.starter !== "even-grid") free = shuffled(free, r);

  // 3. Sizes from the starter layout.
  const sizes = new Map<string, Size>();
  const total = images.length;
  let bigLeft = Math.max(1, Math.round(total / 6)) - tiles.filter((t) => t.w === 2 && t.h === 2).length;

  free.forEach((img, i) => {
    let s: Size = SMALL;
    if (opts.starter === "even-grid") s = SMALL;
    else if (i === 0 && total > 1 && !tiles.some((t) => t.w * t.h >= 4)) {
      // The hero: the first free image, as large as the starter asks.
      s = opts.starter === "hero-top" ? { w: cols, h: total > cols ? 2 : 1 } : BIG;
      if (opts.starter === "hero-top" && total <= 2) s = { w: cols, h: 1 };
      bigLeft--;
    } else if (opts.starter === "mosaic" || opts.starter === "hero-left" || opts.starter === "hero-top") {
      s = mosaicSize(img, r, bigLeft);
      if (s === BIG) bigLeft--;
    }
    sizes.set(img.id, { w: Math.min(s.w, cols), h: s.h });
  });

  // Hero placement: hero-left and hero-top start at the top-left corner when it's free.
  const hero = free[0];
  if (hero && opts.starter !== "even-grid" && opts.starter !== "mosaic") {
    const s = sizes.get(hero.id)!;
    if (s.w * s.h > 1 && grid.fits(0, 0, s)) {
      grid.put(hero.id, 0, 0, s);
      tiles.push({ imageId: hero.id, x: 0, y: 0, ...s, locked: false });
      free = free.slice(1);
    }
  }

  // 4. Pack: first fit from the top; shrink when a shape no longer fits well.
  for (const img of free) {
    let s = sizes.get(img.id)!;
    let at = grid.firstFit(s);
    // Don't let a big shape jump far below the current bottom and leave a gap behind it.
    if (at && s.w * s.h > 1 && at.y > Math.max(0, grid.rows - 1)) {
      const small = grid.firstFit(SMALL);
      if (small && small.y < at.y) {
        s = SMALL;
        at = small;
      }
    }
    if (!at) {
      s = SMALL;
      at = grid.firstFit(SMALL)!;
    }
    grid.put(img.id, at.x, at.y, s);
    tiles.push({ imageId: img.id, x: at.x, y: at.y, ...s, locked: false });
  }

  fillHoles(grid, tiles);
  return tiles.sort((a, b) => a.y - b.y || a.x - b.x);
}

/**
 * Grows unlocked tiles into empty cells so the bento has no holes:
 * widen the tile to the left of a hole, or lengthen the tile above it, when its whole edge is free.
 * The last row can end short only when nothing can grow into it.
 */
function fillHoles(grid: Grid, tiles: Tile[]) {
  const byId = new Map(tiles.map((t) => [t.imageId, t]));
  let changed = true;
  while (changed) {
    changed = false;
    const rows = grid.rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        if (grid.at(x, y)) continue;
        // Try the tile on the left: it grows by one column if its full height is free in this column.
        const left = x > 0 ? byId.get(grid.at(x - 1, y) ?? "") : undefined;
        if (left && !left.locked && left.x + left.w === x && left.y === y) {
          const col = { w: 1, h: left.h };
          if (grid.fits(x, left.y, col)) {
            grid.put(left.imageId, x, left.y, col);
            left.w += 1;
            changed = true;
            continue;
          }
        }
        // Then the tile above: it grows by one row if its full width is free in this row.
        const up = y > 0 ? byId.get(grid.at(x, y - 1) ?? "") : undefined;
        if (up && !up.locked && up.y + up.h === y && up.x === x) {
          const row = { w: up.w, h: 1 };
          if (grid.fits(up.x, y, row)) {
            grid.put(up.imageId, up.x, y, row);
            up.h += 1;
            changed = true;
            continue;
          }
        }
        // Then the tile on the right (the hole is at the start of a row).
        const right = byId.get(grid.at(x + 1, y) ?? "");
        if (right && !right.locked && right.x === x + 1 && right.y === y && grid.fits(x, y, { w: 1, h: right.h })) {
          grid.put(right.imageId, x, y, { w: 1, h: right.h });
          right.x -= 1;
          right.w += 1;
          changed = true;
        }
      }
    }
  }
}

/** Pixel rectangle for a tile inside a bento of the given width. */
export function tileRect(t: Tile, opts: { width: number; cols?: number; gap: number; rowHeight: number }) {
  const cols = opts.cols ?? DEFAULT_COLS;
  const cell = (opts.width - opts.gap * (cols - 1)) / cols;
  return {
    left: t.x * (cell + opts.gap),
    top: t.y * (opts.rowHeight + opts.gap),
    width: t.w * cell + (t.w - 1) * opts.gap,
    height: t.h * opts.rowHeight + (t.h - 1) * opts.gap,
  };
}

/** Height of the whole bento in pixels. */
export function bentoHeight(tiles: Tile[], opts: { gap: number; rowHeight: number }) {
  const rows = tiles.reduce((m, t) => Math.max(m, t.y + t.h), 0);
  return rows ? rows * opts.rowHeight + (rows - 1) * opts.gap : 0;
}

/** Locks or unlocks one tile in place. */
export function setLocked(tiles: Tile[], imageId: string, locked: boolean): Tile[] {
  return tiles.map((t) => (t.imageId === imageId ? { ...t, locked } : t));
}
