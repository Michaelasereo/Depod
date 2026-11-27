"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { tileRect, bentoHeight, type Tile } from "@/lib/bento/layout";
import { checkImages, exportSize, forcedOneX, renderBento } from "@/lib/bento/export";
import { Toggle } from "../ui/controls";
import { Modal } from "../ui/overlays";
import { Scrim } from "./dialogs";
import type { CanvasImage } from "./types";

/* Figma 15 Export bento, 41a Large export, 41b Missing image blocks export. */
export function ExportDialog({
  tiles,
  images,
  fileName,
  markLocked,
  onClose,
}: {
  tiles: Tile[];
  images: Map<string, CanvasImage>;
  fileName: string;
  markLocked: boolean;
  onClose: () => void;
}) {
  const large = forcedOneX(tiles);
  const [size, setSize] = useState<1 | 2>(large ? 1 : 2);
  const [mark, setMark] = useState(true);
  const [state, setState] = useState<"checking" | "ready" | "working">("checking");
  const [missing, setMissing] = useState<string[]>([]);
  const [loaded, setLoaded] = useState<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    let live = true;
    checkImages(tiles, (id) => images.get(id)?.url).then((r) => {
      if (!live) return;
      setLoaded(r.loaded);
      setMissing(r.missing);
      setState("ready");
    });
    return () => {
      live = false;
    };
  }, [tiles, images]);

  const download = async () => {
    setState("working");
    try {
      const blob = await renderBento(tiles, loaded, { size: large ? 1 : size, mark: markLocked || mark });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${fileName.replace(/[\\/:*?"<>|]+/g, "").trim() || "bento"}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      onClose();
    } catch {
      setState("ready");
    }
  };

  // Live preview, scaled to fit a 432 × 176 box like Figma 15.
  const fullH = bentoHeight(tiles, { gap: 8, rowHeight: 196 });
  const scale = Math.min(416 / 704, 160 / Math.max(fullH, 1));
  const pw = 704 * scale;
  const ph = fullH * scale;
  const names = missing.map((id) => images.get(id)?.name ?? "An image");
  const blocked = missing.length > 0;

  return (
    <Scrim onClose={onClose}>
      <Modal
        title="Export bento"
        secondaryLabel="Cancel"
        onSecondary={onClose}
        primaryLabel={state === "working" ? "Exporting…" : state === "checking" ? "Checking images…" : "Download PNG"}
        primaryIcon="download"
        primaryDisabled={blocked || state !== "ready"}
        onPrimary={download}
        onClose={onClose}
      >
        <div className="flex justify-center rounded-xl bg-bg-subtle p-3">
          <div className="relative" style={{ width: pw, height: ph }}>
            {tiles.map((t) => {
              const r = tileRect(t, { width: 704, gap: 8, rowHeight: 196 });
              const img = images.get(t.imageId);
              return (
                <span
                  key={t.imageId}
                  className="absolute overflow-hidden rounded-[4px] bg-status-danger-bg bg-cover bg-center"
                  style={{ left: r.left * scale, top: r.top * scale, width: r.width * scale, height: r.height * scale, backgroundImage: img && !missing.includes(t.imageId) ? `url("${img.url}")` : undefined }}
                />
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-label-13 text-text-primary">Size</span>
          {([1, 2] as const).map((s) => {
            const d = exportSize(tiles, s);
            const disabled = s === 2 && large;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={size === s}
                disabled={disabled}
                onClick={() => setSize(s)}
                className={cn("flex items-center gap-3 text-left text-body-15", disabled && "opacity-40")}
              >
                <span className={cn("size-[18px] shrink-0 rounded-full bg-bg-surface", size === s ? "border-[5px] border-border-focus" : "border-[1.5px] border-border-strong")} />
                <span className="text-label-13 text-text-primary">{s}x</span>
                <span className="text-text-secondary">
                  {d.width} × {d.height} px
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-label-13 text-text-primary">Made with Depod mark</span>
            {markLocked && <span className="text-caption-12 text-text-tertiary">Free plans can&apos;t turn this off.</span>}
          </div>
          <Toggle checked={markLocked || mark} disabled={markLocked} onChange={setMark} label="Made with Depod mark" />
        </div>

        {large && (
          <p className="rounded-xl bg-bg-subtle px-4 py-3 text-label-13 text-text-primary">
            This bento has {tiles.length} tiles, so it exports at 1x to keep the file usable.
          </p>
        )}
        {blocked && (
          <p role="alert" className="rounded-xl bg-status-danger-bg px-4 py-3 text-label-13 text-text-danger">
            {names.length === 1 ? `${names[0]} didn't load.` : `${names.length} images didn't load.`} Replace {names.length === 1 ? "it" : "them"} or remove {names.length === 1 ? "it" : "them"} from the bento to export.
          </p>
        )}
      </Modal>
    </Scrim>
  );
}
