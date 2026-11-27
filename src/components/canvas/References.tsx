"use client";

import { cn } from "@/lib/cn";
import { Icon } from "../icon/Icon";
import { Button } from "../ui/Button";
import { Illustration } from "../illustration/Illustration";
import type { CanvasImage } from "./types";

/* Figma 4 · References: dashed area, 3-column masonry, selection and Add to bento (14, 20c, 22, 40b). */
export const REF_WIDTH = 560;
const PAD = 20;
const GAP = 8;
const COLS = 3;
const COL_W = (REF_WIDTH - PAD * 2 - GAP * (COLS - 1)) / COLS;

export function masonry(images: CanvasImage[]) {
  const heights = Array(COLS).fill(0);
  const placed = images.map((img) => {
    const ratio = Math.min(1.8, Math.max(0.6, img.width / img.height || 1));
    const h = Math.round(COL_W / ratio);
    const col = heights.indexOf(Math.min(...heights));
    const pos = { img, left: col * (COL_W + GAP), top: heights[col], width: COL_W, height: h };
    heights[col] += h + GAP;
    return pos;
  });
  return { placed, height: Math.max(0, ...heights) - GAP };
}

export function References({
  images,
  inBento,
  selected,
  canEdit,
  onToggle,
  onClear,
  onAddSelected,
  onDeleteSelected,
  onAddAll,
  onBrowse,
  onOpen,
  onRetry,
}: {
  images: CanvasImage[];
  inBento: Set<string>;
  selected: Set<string>;
  canEdit: boolean;
  onToggle: (id: string) => void;
  onClear: () => void;
  onAddSelected: () => void;
  onDeleteSelected: () => void;
  onAddAll: () => void;
  onBrowse: () => void;
  onOpen: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const { placed, height } = masonry(images);
  const ready = images.filter((i) => !i.status);
  const notInBento = ready.filter((i) => !inBento.has(i.id));
  return (
    <section
      aria-label="References"
      className="relative rounded-3xl border-[1.5px] border-dashed border-border-strong"
      style={{ width: REF_WIDTH, minHeight: 680 }}
    >
      <header className="flex h-14 items-center justify-between px-5">
        <span className="flex items-baseline gap-2">
          <span className="text-label-13 text-text-primary">References</span>
          <span className="text-caption-12 text-text-secondary">{ready.length ? `${ready.length} image${ready.length === 1 ? "" : "s"}` : "Empty"}</span>
        </span>
        {canEdit && notInBento.length > 0 && (
          <Button variant="ghost" size="small" leadingIcon="plus" onClick={onAddAll}>
            Add all to bento
          </Button>
        )}
      </header>

      {images.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-10 pb-16 pt-24 text-center">
          <Illustration name="references-empty" />
          <div className="h-2" />
          <h2 className="text-heading-20 text-text-primary">No references yet</h2>
          <p className="max-w-[300px] text-body-15 text-text-secondary">Paste from Pinterest, drop screenshots or browse your files.</p>
          {canEdit && (
            <>
              <div className="h-2" />
              <Button onClick={onBrowse}>Browse files</Button>
            </>
          )}
        </div>
      ) : (
        <div className="relative mx-5 mb-5" style={{ height }}>
          {placed.map(({ img, left, top, width, height: h }) => {
            const isSel = selected.has(img.id);
            if (img.status === "failed")
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => onRetry(img.id)}
                  className="absolute flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border-strong bg-bg-surface text-caption-12 text-text-secondary"
                  style={{ left, top, width, height: h }}
                >
                  <Icon name="retry" />
                  Upload failed · Retry
                </button>
              );
            return (
              <div
                key={img.id}
                draggable={canEdit && !img.status}
                onDragStart={(e) => {
                  const ids = isSel ? [...selected] : [img.id];
                  e.dataTransfer.setData("application/x-depod-images", JSON.stringify(ids));
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => canEdit && !img.status && onToggle(img.id)}
                onDoubleClick={() => !img.status && onOpen(img.id)}
                className={cn(
                  "group absolute cursor-pointer overflow-hidden rounded-xl bg-bg-subtle",
                  isSel && "outline-2 outline-offset-0 outline-border-focus",
                )}
                style={{ left, top, width, height: h }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.name} draggable={false} className={cn("size-full object-cover", img.status === "uploading" && "opacity-50")} />
                {img.status === "uploading" && (
                  <div className="absolute inset-x-3 bottom-3 h-1 overflow-hidden rounded-full bg-bg-surface">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-action-primary" />
                  </div>
                )}
                {canEdit && !img.status && (
                  <span
                    className={cn(
                      "absolute left-2 top-2 size-[18px] items-center justify-center rounded-[5px] bg-action-primary text-action-on-primary",
                      isSel ? "flex" : "hidden group-hover:flex group-hover:bg-bg-surface group-hover:text-transparent",
                    )}
                  >
                    <Icon name="check" size={16} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selected.size > 0 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-border-default bg-bg-surface-raised py-1.5 pl-4 pr-1.5 shadow-float">
          <span className="whitespace-nowrap text-label-13 text-text-primary">{selected.size} selected</span>
          <Button variant="ghost" size="small" onClick={onClear}>
            Clear
          </Button>
          <Button variant="ghost" size="small" leadingIcon="trash" onClick={onDeleteSelected}>
            Delete
          </Button>
          <Button size="small" leadingIcon="plus" onClick={onAddSelected}>
            Add to bento
          </Button>
        </div>
      )}
    </section>
  );
}
