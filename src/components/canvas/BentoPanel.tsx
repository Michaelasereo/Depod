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

/* 22: the four starter layouts as small diagrams. */
function StarterDiagram({ id }: { id: StarterLayout }) {
  const box = "rounded-md bg-bg-surface";
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
  return <div className="h-[118px] w-full rounded-xl bg-bg-subtle p-2.5">{cls[id]}</div>;
}

export function StarterPicker({ value, onPick }: { value: StarterLayout; onPick: (s: StarterLayout) => void }) {
  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-heading-20 text-text-primary">Pick a starter layout</h2>
        <p className="text-body-15 text-text-secondary">It re-arranges itself as you add images. You can change it in Settings.</p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        {STARTERS.map((s) => (
          <button key={s.id} type="button" onClick={() => onPick(s.id)} aria-pressed={value === s.id} className="flex flex-col gap-2 text-left">
            <span className={cn("rounded-2xl border-2 p-0.5", value === s.id ? "border-border-focus" : "border-transparent")}>
              <StarterDiagram id={s.id} />
            </span>
            <span className={cn("text-caption-12", value === s.id ? "text-text-primary" : "text-text-secondary")}>{s.label}</span>
          </button>
        ))}
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
  const missing = !img;
  return (
    <div
      className={cn("group absolute overflow-hidden rounded-xl", missing ? "border border-dashed border-border-strong bg-bg-surface" : "bg-bg-subtle")}
      style={rect}
      onDoubleClick={onOpen}
    >
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img.url} alt={img.name} draggable={false} className="size-full object-cover" />
      )}
      {missing && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-caption-12 text-text-secondary">
          <Icon name="image" />
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
}) {
  const [settings, setSettings] = useState(false);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [over, setOver] = useState(false);
  const settingsRef = useClickAway(settings, () => setSettings(false));
  const menuRef = useClickAway(!!menu, () => setMenu(null));
  const frameRef = useRef<HTMLDivElement>(null);

  const inner = BENTO_WIDTH - PAD * 2;
  const height = Math.max(bentoHeight(tiles, { gap: GAP, rowHeight: ROW_H }), 0);
  const allLocked = tiles.length > 0 && tiles.every((t) => t.locked);
  const menuTile = menu ? tiles.find((t) => t.imageId === menu.id) : undefined;

  return (
    <section aria-label="Bento" className="flex flex-col gap-3" style={{ width: BENTO_WIDTH }}>
      <header className="flex h-7 items-center justify-between">
        <span className="flex items-center gap-2.5">
          <span className="text-label-13 text-text-primary">Bento</span>
          {tiles.length > 0 && <Badge>Auto-arranged</Badge>}
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
            <div ref={settingsRef} className="relative">
              <Button variant="ghost" size="small" leadingIcon="sliders" aria-expanded={settings} onClick={() => setSettings(!settings)}>
                Settings
              </Button>
              {settings && (
                <div className="absolute right-0 top-9 z-20">
                  <Menu>
                    {STARTERS.map((s) => (
                      <MenuItem
                        key={s.id}
                        icon="grid"
                        checked={starter === s.id}
                        onSelect={() => {
                          onStarter(s.id);
                          setSettings(false);
                        }}
                      >
                        {s.label}
                      </MenuItem>
                    ))}
                  </Menu>
                </div>
              )}
            </div>
          </span>
        )}
      </header>

      <div
        ref={frameRef}
        className={cn("relative rounded-3xl border bg-bg-surface", over ? "border-border-focus" : "border-border-default")}
        style={{ padding: PAD, minHeight: showPicker || tiles.length === 0 ? 400 : undefined }}
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
          <StarterPicker value={starter} onPick={onStarter} />
        ) : tiles.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-10 py-16 text-center">
            <Illustration name="moodboard-bento" />
            <div className="h-2" />
            <h2 className="text-heading-20 text-text-primary">Your bento is empty</h2>
            <p className="max-w-[300px] text-body-15 text-text-secondary">Select references and press Add to bento, or add them all.</p>
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
                rect={tileRect(t, { width: inner, gap: GAP, rowHeight: ROW_H })}
                canEdit={canEdit}
                onLock={() => onLock(t.imageId, !t.locked)}
                onOpen={() => onOpen(t.imageId)}
                onMenu={(r) => {
                  const f = frameRef.current!.getBoundingClientRect();
                  const scale = f.width / BENTO_WIDTH;
                  setMenu({ id: t.imageId, x: (r.right - f.left) / scale, y: (r.bottom - f.top) / scale + 4 });
                }}
              />
            ))}
          </div>
        )}

        {menu && menuTile && (
          <div ref={menuRef} className="absolute z-20" style={{ left: Math.min(menu.x - 234, BENTO_WIDTH - 246), top: menu.y }}>
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
    </section>
  );
}
