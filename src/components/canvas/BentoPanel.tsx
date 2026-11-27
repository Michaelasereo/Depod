"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { bentoHeight, tileRect, type StarterLayout, type Tile } from "@/lib/bento/layout";
import { STARTERS } from "@/lib/bento/doc";
import { Icon } from "../icon/Icon";
import { Button, IconButton } from "../ui/Button";
import { Badge } from "../ui/display";
import { Menu, MenuDivider, MenuItem } from "../ui/overlays";
import { Illustration } from "../illustration/Illustration";
import type { CanvasImage } from "./types";

/* Figma 4 · Bento: header (Auto-arranged, Shuffle, Settings), the bento frame, tiles (20a, 22, 39a, 39b). */
export const BENTO_WIDTH = 728;
const PAD = 12;
export const GAP = 8;
export const ROW_H = 196;

function useClickAway(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && close();
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("pointerdown", h);
    window.addEventListener("keydown", k);
    return () => {
      window.removeEventListener("pointerdown", h);
      window.removeEventListener("keydown", k);
    };
  }, [open, close]);
  return ref;
}

/* 22: the four starter layouts as small diagrams. Picked cards turn white with grey tiles (22a). */
function StarterDiagram({ id, on }: { id: StarterLayout; on: boolean }) {
  const box = cn("rounded-md", on ? "bg-bg-subtle" : "bg-bg-surface");
  const cls: Record<StarterLayout, React.ReactNode> = {
    "hero-left": (
      <div className="grid h-full grid-cols-[1.9fr_1fr] gap-1.5">
        <div className={box} />
        <div className="grid gap-1.5">
          <div className={box} />
          <div className={box} />
        </div>
      </div>
    ),
    "hero-top": (
      <div className="grid h-full grid-rows-[1fr_1fr] gap-1.5">
        <div className={box} />
        <div className="grid grid-cols-3 gap-1.5">
          <div className={box} />
          <div className={box} />
          <div className={box} />
        </div>
      </div>
    ),
    "even-grid": (
      <div className="grid h-full grid-cols-3 grid-rows-2 gap-1.5">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={box} />
        ))}
      </div>
    ),
    mosaic: (
      <div className="grid h-full grid-cols-[0.6fr_1fr_1fr] grid-rows-2 gap-1.5">
        <div className={cn(box, "row-span-2")} />
        <div className={cn(box, "col-span-2")} />
        <div className={box} />
        <div className={box} />
      </div>
    ),
  };
  return (
    <div className={cn("h-[200px] w-full rounded-2xl border-2 p-2.5", on ? "border-border-focus bg-bg-surface" : "border-transparent bg-bg-subtle")}>
      {cls[id]}
    </div>
  );
}

/*
 * 22 / 22a: pick with the radios, then Continue. 22b: the same picker reopened from Settings,
 * with the current layout picked and Cancel.
 */
export function StarterPicker({
  value,
  onContinue,
  onCancel,
}: {
  /** null the first time: nothing is picked and Continue waits. */
  value: StarterLayout | null;
  onContinue: (s: StarterLayout) => void;
  onCancel?: () => void;
}) {
  const [choice, setChoice] = useState<StarterLayout | null>(value);
  const changing = !!onCancel;
  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-heading-20 text-text-primary">{changing ? "Change starter layout" : "Pick a starter layout"}</h2>
        <p className="text-body-15 text-text-secondary">
          {changing
            ? "Your images re-arrange into the new layout. Locked tiles stay where they are."
            : "It re-arranges itself as you add images. You can change it later in Settings."}
        </p>
      </div>
      <div role="radiogroup" aria-label="Starter layout" className="grid grid-cols-2 gap-x-4 gap-y-5">
        {STARTERS.map((s) => {
          const on = choice === s.id;
          return (
            <button key={s.id} type="button" role="radio" aria-checked={on} onClick={() => setChoice(s.id)} className="flex flex-col gap-2 text-left">
              <StarterDiagram id={s.id} on={on} />
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "inline-block size-[18px] shrink-0 rounded-full bg-bg-surface",
                    on ? "border-[5px] border-border-focus" : "border-[1.5px] border-border-strong",
                  )}
                />
                <span className="text-label-13 text-text-primary">{s.label}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button disabled={!choice} onClick={() => choice && onContinue(choice)}>
          Continue
        </Button>
      </div>
    </div>
  );
}

function TileView({
  tile,
  img,
  rect,
  canEdit,
  onLock,
  onMenu,
  onOpen,
}: {
  tile: Tile;
  img?: CanvasImage;
  rect: { left: number; top: number; width: number; height: number };
  canEdit: boolean;
  onLock: () => void;
  onMenu: (rect: DOMRect) => void;
  onOpen: () => void;
}) {
  // 41b: no image, or its file didn't load.
  const [broken, setBroken] = useState<string | null>(null);
  const missing = !img || broken === img.url;
  return (
    <div className={cn("group absolute overflow-hidden rounded-xl", missing ? "bg-status-danger-bg" : "bg-bg-subtle")} style={rect} onDoubleClick={onOpen}>
      {img && !missing && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img.url} alt={img.name} draggable={false} className="size-full object-cover" onError={() => setBroken(img.url)} />
      )}
      {missing && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-caption-12 text-text-danger">
          <Icon name="alert" />
          Image missing
        </span>
      )}
      {tile.locked && (
        <span className="absolute left-2 top-2">
          <Badge type="inverse" icon="lock">
            Locked
          </Badge>
        </span>
      )}
      {canEdit && (
        <div className="absolute right-2 top-2 hidden rounded-[10px] border border-border-default bg-bg-surface-raised p-0.5 shadow-float group-hover:flex has-[[aria-expanded=true]]:flex">
          <IconButton icon={tile.locked ? "unlock" : "lock"} label={tile.locked ? "Unlock tile" : "Lock tile"} size="small" onClick={onLock} />
          <IconButton icon="comment" label="Comment (comes with teams)" size="small" disabled />
          <IconButton icon="more" label="More" size="small" onClick={(e) => onMenu((e.currentTarget as HTMLElement).getBoundingClientRect())} />
        </div>
      )}
    </div>
  );
}

export function BentoPanel({
  tiles,
  images,
  starter,
  showPicker,
  canEdit,
  onShuffle,
  onStarter,
  onLock,
  onRemove,
  onReplace,
  onOpen,
  onDropImages,
  onAddAll,
  hasReferences,
  toast,
  width = BENTO_WIDTH,
  title = "Bento",
  badge = "Auto-arranged",
  allowStarter = true,
  emptyTitle = "Your bento is empty",
  emptyBody = "Select references and press Add to bento, or add them all.",
  footer,
}: {
  tiles: Tile[];
  images: Map<string, CanvasImage>;
  starter: StarterLayout;
  showPicker: boolean;
  canEdit: boolean;
  onShuffle: () => void;
  onStarter: (s: StarterLayout) => void;
  onLock: (imageId: string, locked: boolean) => void;
  onRemove: (imageId: string) => void;
  onReplace: (imageId: string) => void;
  onOpen: (imageId: string) => void;
  onDropImages: (ids: string[]) => void;
  onAddAll: () => void;
  hasReferences: boolean;
  toast: (msg: string) => void;
  /** The project bento (05) is narrower and has no starter layout. */
  width?: number;
  title?: string;
  badge?: string;
  allowStarter?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  footer?: React.ReactNode;
}) {
  const [settings, setSettings] = useState(false);
  const [changing, setChanging] = useState(false);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [over, setOver] = useState(false);
  const settingsRef = useClickAway(settings, () => setSettings(false));
  const menuRef = useClickAway(!!menu, () => setMenu(null));
  const frameRef = useRef<HTMLDivElement>(null);

  const inner = width - PAD * 2;
  // Narrower bentos keep the same cell proportions.
  const rowH = Math.round((ROW_H * width) / BENTO_WIDTH);
  const height = Math.max(bentoHeight(tiles, { gap: GAP, rowHeight: rowH }), 0);
  const allLocked = tiles.length > 0 && tiles.every((t) => t.locked);
  const menuTile = menu ? tiles.find((t) => t.imageId === menu.id) : undefined;

  return (
    <section aria-label="Bento" className="flex flex-col gap-3" style={{ width }}>
      <header className="flex h-7 items-center justify-between">
        <span className="flex items-center gap-2.5">
          <span className="text-label-13 text-text-primary">{title}</span>
          {tiles.length > 0 && badge && <Badge>{badge}</Badge>}
        </span>
        {canEdit && tiles.length > 0 && (
          <span className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="small"
              leadingIcon="shuffle"
              className={cn(allLocked && "opacity-40")}
              aria-disabled={allLocked}
              onClick={() => (allLocked ? toast("All tiles are locked. Unlock one to shuffle.") : onShuffle())}
            >
              Shuffle
            </Button>
            {allowStarter && (
              <div ref={settingsRef} className="relative">
                <Button variant="ghost" size="small" leadingIcon="sliders" aria-expanded={settings} onClick={() => setSettings(!settings)}>
                  Settings
                </Button>
                {settings && (
                  <div className="absolute right-0 top-9 z-20">
                    <Menu>
                      <MenuItem
                        icon="grid"
                        onSelect={() => {
                          setSettings(false);
                          setChanging(true);
                        }}
                      >
                        Change starter layout
                      </MenuItem>
                    </Menu>
                  </div>
                )}
              </div>
            )}
          </span>
        )}
      </header>

      <div
        ref={frameRef}
        className={cn("relative rounded-3xl border bg-bg-surface", over ? "border-border-focus" : "border-border-default")}
        style={{
          padding: PAD,
          minHeight: showPicker || changing || tiles.length === 0 ? 400 : undefined,
        }}
        onDragOver={(e) => {
          if (!canEdit || !e.dataTransfer.types.includes("application/x-depod-images")) return;
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          setOver(false);
          const raw = e.dataTransfer.getData("application/x-depod-images");
          if (!raw) return;
          e.preventDefault();
          e.stopPropagation();
          onDropImages(JSON.parse(raw));
        }}
      >
        {showPicker ? (
          <StarterPicker value={null} onContinue={onStarter} />
        ) : changing ? (
          <StarterPicker
            value={starter}
            onCancel={() => setChanging(false)}
            onContinue={(s) => {
              setChanging(false);
              if (s !== starter) onStarter(s);
            }}
          />
        ) : tiles.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-10 py-16 text-center">
            <Illustration name="moodboard-bento" />
            <div className="h-2" />
            <h2 className="text-heading-20 text-text-primary">{emptyTitle}</h2>
            <p className="max-w-[300px] text-body-15 text-text-secondary">{emptyBody}</p>
            {canEdit && hasReferences && (
              <>
                <div className="h-2" />
                <Button onClick={onAddAll}>Add all to bento</Button>
              </>
            )}
          </div>
        ) : (
          <div className="relative" style={{ height }}>
            {tiles.map((t) => (
              <TileView
                key={t.imageId}
                tile={t}
                img={images.get(t.imageId)}
                rect={tileRect(t, { width: inner, gap: GAP, rowHeight: rowH })}
                canEdit={canEdit}
                onLock={() => onLock(t.imageId, !t.locked)}
                onOpen={() => onOpen(t.imageId)}
                onMenu={(r) => {
                  const f = frameRef.current!.getBoundingClientRect();
                  const scale = f.width / width;
                  setMenu({
                    id: t.imageId,
                    x: (r.right - f.left) / scale,
                    y: (r.bottom - f.top) / scale + 4,
                  });
                }}
              />
            ))}
          </div>
        )}

        {menu && menuTile && (
          <div ref={menuRef} className="absolute z-20" style={{ left: Math.min(menu.x - 234, width - 246), top: menu.y }}>
            <Menu>
              <MenuItem icon="comment">Comment</MenuItem>
              <MenuItem icon="image" onSelect={() => (setMenu(null), onReplace(menu.id))}>
                Replace image
              </MenuItem>
              <MenuItem icon={menuTile.locked ? "unlock" : "lock"} onSelect={() => (setMenu(null), onLock(menu.id, !menuTile.locked))}>
                {menuTile.locked ? "Unlock" : "Lock"}
              </MenuItem>
              <MenuDivider />
              <MenuItem icon="trash" danger onSelect={() => (setMenu(null), onRemove(menu.id))}>
                Remove from bento
              </MenuItem>
            </Menu>
          </div>
        )}
      </div>
      {footer}
    </section>
  );
}
