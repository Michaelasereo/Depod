import { describe, expect, it } from "vitest";
import { arrange, bentoHeight, setLocked, tileRect, type BentoImage, type StarterLayout, type Tile } from "./layout";

const imgs = (n: number, seed = 7): BentoImage[] => {
  let s = seed;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, (_, i) => ({ id: `img${i}`, ratio: [0.66, 0.8, 1, 1.33, 1.78][Math.floor(r() * 5)] }));
};

/** Every image once, no overlaps, inside the columns, and no holes above the last row. */
function check(tiles: Tile[], images: BentoImage[], cols = 4) {
  expect(tiles.map((t) => t.imageId).sort()).toEqual(images.map((i) => i.id).sort());
  const seen = new Map<string, string>();
  for (const t of tiles) {
    expect(t.x).toBeGreaterThanOrEqual(0);
    expect(t.x + t.w).toBeLessThanOrEqual(cols);
    for (let y = t.y; y < t.y + t.h; y++)
      for (let x = t.x; x < t.x + t.w; x++) {
        const k = `${x},${y}`;
        expect(seen.has(k), `overlap at ${k}`).toBe(false);
        seen.set(k, t.imageId);
      }
  }
  const rows = tiles.reduce((m, t) => Math.max(m, t.y + t.h), 0);
  const holes: string[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (!seen.has(`${x},${y}`)) holes.push(`${x},${y}`);
  return holes;
}

const starters: StarterLayout[] = ["hero-left", "hero-top", "even-grid", "mosaic"];

describe("arrange", () => {
  for (const starter of starters) {
    for (const n of [1, 2, 3, 12, 60]) {
      it(`${starter}: ${n} image${n === 1 ? "" : "s"} fill the bento with no holes or overlaps`, () => {
        const images = imgs(n);
        for (const seed of [1, 2, 3, 42, 999]) {
          const tiles = arrange(images, { starter, seed });
          expect(check(tiles, images)).toEqual([]);
        }
      });
    }
  }

  it("the same seed gives the same layout, so a saved bento reloads exactly", () => {
    const images = imgs(12);
    expect(arrange(images, { starter: "mosaic", seed: 5 })).toEqual(arrange(images, { starter: "mosaic", seed: 5 }));
  });

  it("shuffle (a new seed) changes the layout", () => {
    const images = imgs(12);
    expect(arrange(images, { starter: "mosaic", seed: 1 })).not.toEqual(arrange(images, { starter: "mosaic", seed: 2 }));
  });

  it("hero-left puts a big tile in the top-left corner", () => {
    const t = arrange(imgs(8), { starter: "hero-left", seed: 3 }).find((t) => t.x === 0 && t.y === 0)!;
    expect(t.w).toBeGreaterThanOrEqual(2);
    expect(t.h).toBeGreaterThanOrEqual(2);
  });

  it("hero-top spans the full width at the top", () => {
    const t = arrange(imgs(8), { starter: "hero-top", seed: 3 }).find((t) => t.x === 0 && t.y === 0)!;
    expect(t.w).toBe(4);
  });

  it("even-grid keeps every tile the same size and the images in order", () => {
    const images = imgs(8);
    const tiles = arrange(images, { starter: "even-grid", seed: 9 });
    expect(tiles.every((t) => t.w === 1 && t.h === 1)).toBe(true);
    expect(tiles.map((t) => t.imageId)).toEqual(images.map((i) => i.id));
  });
});

describe("locked tiles", () => {
  it("stay in the same cells through shuffles", () => {
    const images = imgs(12);
    const first = arrange(images, { starter: "mosaic", seed: 1 });
    const pick = first[3];
    const locked = setLocked(first, pick.imageId, true);
    for (const seed of [2, 3, 4, 5, 6, 7, 8]) {
      const next = arrange(images, { starter: "mosaic", seed, previous: locked });
      const again = next.find((t) => t.imageId === pick.imageId)!;
      expect({ x: again.x, y: again.y, w: again.w, h: again.h, locked: again.locked }).toEqual({ x: pick.x, y: pick.y, w: pick.w, h: pick.h, locked: true });
      expect(check(next, images)).toEqual([]);
    }
  });

  it("stay put when images are added", () => {
    const images = imgs(6);
    const first = arrange(images, { starter: "hero-left", seed: 1 });
    const locked = setLocked(setLocked(first, first[0].imageId, true), first[2].imageId, true);
    const more = [...images, ...imgs(6, 99).map((i) => ({ ...i, id: `new-${i.id}` }))];
    const next = arrange(more, { starter: "hero-left", seed: 1, previous: locked });
    for (const t of locked.filter((t) => t.locked)) {
      const again = next.find((n) => n.imageId === t.imageId)!;
      expect([again.x, again.y, again.w, again.h]).toEqual([t.x, t.y, t.w, t.h]);
    }
    expect(check(next, more)).toEqual([]);
  });

  it("every tile locked: shuffle changes nothing", () => {
    const images = imgs(5);
    const all = arrange(images, { starter: "mosaic", seed: 1 }).map((t) => ({ ...t, locked: true }));
    const next = arrange(images, { starter: "mosaic", seed: 77, previous: all });
    expect(next).toEqual([...all].sort((a, b) => a.y - b.y || a.x - b.x));
  });

  it("a removed image's lock is dropped", () => {
    const images = imgs(6);
    const first = setLocked(arrange(images, { starter: "mosaic", seed: 1 }), "img0", true);
    const next = arrange(images.slice(1), { starter: "mosaic", seed: 1, previous: first });
    expect(next.find((t) => t.imageId === "img0")).toBeUndefined();
    expect(check(next, images.slice(1))).toEqual([]);
  });
});

describe("pixels", () => {
  it("matches the Figma bento: 4 columns, 8 px gap in a 704 px wide grid", () => {
    const r = tileRect({ imageId: "a", x: 1, y: 0, w: 2, h: 1, locked: false }, { width: 704, gap: 8, rowHeight: 196 });
    expect(r).toEqual({ left: 178, top: 0, width: 348, height: 196 });
    expect(bentoHeight([{ imageId: "a", x: 0, y: 0, w: 2, h: 2, locked: false }], { gap: 8, rowHeight: 196 })).toBe(400);
  });
});
