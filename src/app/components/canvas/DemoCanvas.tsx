"use client";

import { MoodboardCanvas } from "@/components/canvas/MoodboardCanvas";
import type { CanvasImage, MoodboardApi } from "@/components/canvas/types";
import { arrange } from "@/lib/bento/layout";

/* A moodboard with sample images and no saving, to check the canvas against Figma without signing in. */
const PAL = ["#C9A27E", "#2F4A3A", "#E8D5C4", "#8C3B2E", "#D8B44A", "#3E5C76", "#B8C4A8", "#E07A5F", "#6E5A7E", "#B5677A", "#F2EAD3", "#344966"];
const sizes: Array<[number, number]> = [[1600, 1200], [1080, 1350], [1200, 900], [900, 1200], [1500, 1000], [1000, 1000], [1200, 1500], [1600, 1000], [1000, 1400], [1400, 1000], [1200, 1200], [1000, 1300]];

const sample = (n: number): CanvasImage[] =>
  Array.from({ length: n }, (_, i) => {
    const [w, h] = sizes[i % sizes.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${PAL[i % PAL.length]}"/></svg>`;
    return { id: `sample-${i}`, url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`, width: w, height: h, name: `IMG_20${41 + i}.jpg`, addedBy: "Ada Obi", addedAt: new Date(Date.now() - 2 * 86400000).toISOString(), hash: `h${i}` };
  });

const api: MoodboardApi = {
  saveBento: async () => {},
  setStarter: async () => {},
  upload: async (f) => ({ id: crypto.randomUUID(), url: URL.createObjectURL(f.blob), width: f.width, height: f.height, name: f.name, hash: f.hash, addedBy: "You", addedAt: new Date().toISOString() }),
  deleteImage: async () => {},
};

export function DemoCanvas({ state }: { state: "filled" | "empty" | "references" }) {
  const images = state === "empty" ? [] : sample(12);
  const bentoImages = images.slice(0, 7);
  const tiles = state === "filled" ? arrange(bentoImages.map((i) => ({ id: i.id, ratio: i.width / i.height })), { starter: "hero-left", seed: 4 }) : [];
  if (tiles[0]) tiles[0].locked = true;
  return (
    <MoodboardCanvas
      api={api}
      data={{
        id: "demo",
        name: state === "empty" ? "Untitled moodboard" : "Spring campaign",
        projectName: "Brand refresh",
        starter: "hero-left",
        images,
        doc: { v: 1, seed: 4, tiles },
        canEdit: true,
        plan: "free",
        imageLimit: 50,
        markLocked: true,
        people: [{ initials: "AO", name: "Ada" }, { initials: "TB", name: "Tunde" }, { initials: "MA", name: "Michael" }],
      }}
    />
  );
}
