"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { arrange, bentoHeight, setLocked, tileRect, type Tile } from "@/lib/bento/layout";
import type { BentoDoc } from "@/lib/bento/doc";
import { Badge, Toast } from "../ui/display";
import { Button } from "../ui/Button";
import { EmptyState, Menu, MenuItem } from "../ui/overlays";
import { NewMoodboardDialog } from "../app/moodboard-dialogs";
import { CanvasNavLeft, CanvasNavRight, SharedNavRight, Toolbar, Zoom, type CanvasTool } from "./chrome";
import type { SharedMode } from "./MoodboardCanvas";
import { BentoPanel } from "./BentoPanel";
import { ReplaceImage } from "./dialogs";
import { ShareDialog } from "./ShareDialog";
import { useViewport } from "./useViewport";
import type { CanvasImage, ProjectApi, ProjectBoard, ProjectData, ShareState } from "./types";

/*
 * The project canvas (Figma 05, 23 empty).
 * Moodboard cards on the left; click images to select them (or drag them) into the project bento on the right.
 */
const WORLD_W = 1440;
const LEFT = 48;
const TOP = 96;
const CARD_W = 372;
const CARD_GAP = 20;
const BENTO_X = 872;
const BENTO_W = 520;

/** One moodboard as a card: its bento, small. Images are selectable and draggable. */
function BoardCard({
  board,
  selected,
  canEdit,
  onToggle,
  selectedIds,
  linked = true,
}: {
  linked?: boolean;
  board: ProjectBoard;
  selected: Set<string>;
  canEdit: boolean;
  onToggle: (id: string) => void;
  selectedIds: () => string[];
}) {
  const inner = CARD_W - 24;
  const rowH = Math.round((196 * inner) / 704);
  const h = bentoHeight(board.tiles, { gap: 6, rowHeight: rowH });
  const byId = new Map(board.images.map((i) => [i.id, i]));
  return (
    <article className="flex flex-col gap-3 rounded-[20px] border border-border-default bg-bg-surface p-3" style={{ width: CARD_W }}>
      <header className="flex h-7 items-center justify-between px-0.5">
        {linked ? (
          <Link href={`/m/${board.id}`} className="truncate text-label-13 text-text-primary hover:underline">
            {board.name}
          </Link>
        ) : (
          <span className="truncate text-label-13 text-text-primary">{board.name}</span>
        )}
      </header>
      {board.tiles.length === 0 ? (
        <div className="flex h-[160px] flex-col items-center justify-center gap-1 rounded-xl bg-bg-subtle text-center">
          <span className="text-label-13 text-text-primary">No bento yet</span>
          {linked && (
            <Link href={`/m/${board.id}`} className="text-caption-12 text-text-secondary underline">
              Open the moodboard to build one
            </Link>
          )}
        </div>
      ) : (
        <div className="relative" style={{ height: h }}>
          {board.tiles.map((t) => {
            const img = byId.get(t.imageId);
            const r = tileRect(t, { width: inner, gap: 6, rowHeight: rowH });
            const on = selected.has(t.imageId);
            return (
              <button
                key={t.imageId}
                type="button"
                aria-pressed={on}
                aria-label={img?.name ?? "Image"}
                disabled={!canEdit || !img}
                draggable={canEdit && !!img}
                onDragStart={(e) => {
                  const ids = on ? selectedIds() : [t.imageId];
                  e.dataTransfer.setData("application/x-depod-images", JSON.stringify(ids));
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => onToggle(t.imageId)}
                className={cn(
                  "absolute overflow-hidden rounded-lg bg-bg-subtle bg-cover bg-center",
                  canEdit && "cursor-pointer",
                  on && "outline-2 outline-offset-0 outline-border-focus",
                )}
                style={{
                  ...r,
                  backgroundImage: img ? `url("${img.url}")` : undefined,
                }}
              >

              </button>
            );
          })}
        </div>
      )}
    </article>
  );
}

export function ProjectCanvas({ data, api, shared }: { data: ProjectData; api: ProjectApi; shared?: SharedMode }) {
  const router = useRouter();
  const [doc, setDoc] = useState<BentoDoc>(data.doc);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tool, setTool] = useState<CanvasTool>(shared ? "hand" : "select");
  const [replacing, setReplacing] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"share" | "new" | null>(null);
  const [share, setShare] = useState<ShareState>(data.share);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const images = useMemo(() => new Map<string, CanvasImage>(data.boards.flatMap((b) => b.images.map((i) => [i.id, i] as const))), [data.boards]);
  const boardOf = useMemo(() => new Map(data.boards.flatMap((b) => b.images.map((i) => [i.id, b.name] as const))), [data.boards]);
  const inBento = useMemo(() => new Set(doc.tiles.map((t) => t.imageId)), [doc.tiles]);

  // ── Saving ────────────────────────────────────────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const save = useCallback(
    (next: BentoDoc) => {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => api.saveBento(next).catch(() => showToast("Couldn't save. Check your connection.")), 400);
    },
    [api, showToast],
  );

  const relayout = useCallback(
    (ids: string[], opts: { seed?: number; previous?: Tile[] } = {}) => {
      setDoc((d) => {
        const list = ids.map((id) => images.get(id)).filter((i): i is CanvasImage => !!i);
        const seed = opts.seed ?? d.seed;
        const tiles = arrange(
          list.map((i) => ({ id: i.id, ratio: i.width / i.height })),
          { starter: "hero-left", seed, previous: opts.previous ?? d.tiles },
        );
        const next: BentoDoc = { v: 1, seed, tiles };
        save(next);
        return next;
      });
    },
    [images, save],
  );

  const bentoIds = () => doc.tiles.map((t) => t.imageId);
  const addToBento = (ids: string[]) => {
    const fresh = ids.filter((id) => !inBento.has(id) && images.has(id));
    setSelected(new Set());
    if (!fresh.length) {
      if (ids.length) showToast("Those images are already in the project bento.");
      return;
    }
    relayout([...bentoIds(), ...fresh]);
  };
  const remove = (id: string) =>
    relayout(
      bentoIds().filter((x) => x !== id),
      { previous: doc.tiles.filter((t) => t.imageId !== id) },
    );
  const lock = (id: string, locked: boolean) =>
    setDoc((d) => {
      const next = { ...d, tiles: setLocked(d.tiles, id, locked) };
      save(next);
      return next;
    });
  const replaceTile = (oldId: string, newId: string) => {
    setDoc((d) => {
      const tiles = d.tiles.some((t) => t.imageId === newId)
        ? d.tiles.map((t) => (t.imageId === oldId ? { ...t, imageId: newId } : t.imageId === newId ? { ...t, imageId: oldId } : t))
        : d.tiles.map((t) => (t.imageId === oldId ? { ...t, imageId: newId } : t));
      const next = { ...d, tiles };
      save(next);
      return next;
    });
    setReplacing(null);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => !(e.target as HTMLElement).closest?.("[data-menu]") && setMenuOpen(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menuOpen]);

  // ── Viewport ──────────────────────────────────────────────────────────────
  const cols: ProjectBoard[][] = [[], []];
  const colH = [0, 0];
  for (const b of data.boards) {
    const c = colH[0] <= colH[1] ? 0 : 1;
    cols[c].push(b);
    const inner = CARD_W - 24;
    colH[c] +=
      64 +
      (b.tiles.length
        ? bentoHeight(b.tiles, {
            gap: 6,
            rowHeight: Math.round((196 * inner) / 704),
          })
        : 160) +
      CARD_GAP;
  }
  const rowH = Math.round((196 * BENTO_W) / 728);
  const bentoH = 40 + (doc.tiles.length ? bentoHeight(doc.tiles, { gap: 8, rowHeight: rowH }) + 24 : 400) + 40;
  const worldH = TOP + Math.max(...colH, bentoH) + 140;
  const { ref: viewportRef, view, panning, grab, zoomIn, zoomOut, handlers } = useViewport({ width: WORLD_W, height: Math.min(worldH, 900) }, tool === "hand");

  const sources = [...new Set(doc.tiles.map((t) => boardOf.get(t.imageId)).filter(Boolean))] as string[];
  const empty = data.boards.length === 0;

  return (
    <div className="fixed inset-0 overflow-hidden bg-bg-canvas">
      {empty ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <EmptyState
            illustration="project-canvas"
            title="This project is empty"
            body="Add moodboards to compare them side by side, then build the project bento from the best images."
            actionLabel={data.canEdit && api.createMoodboard ? "Add moodboard" : undefined}
            onAction={() => setDialog("new")}
          />
        </div>
      ) : (
        <div ref={viewportRef} className={cn("absolute inset-0", grab && "cursor-grab", panning && "cursor-grabbing")} {...handlers}>
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
              width: WORLD_W,
              height: worldH,
              pointerEvents: grab ? "none" : undefined,
            }}
          >
            <div className="absolute flex gap-5" style={{ left: LEFT, top: TOP }}>
              {cols.map((list, i) => (
                <div key={i} className="flex flex-col gap-5">
                  {list.map((b) => (
                    <BoardCard
                      key={b.id}
                      board={b}
                      selected={selected}
                      canEdit={data.canEdit}
                      linked={!shared}
                      selectedIds={() => [...selected]}
                      onToggle={(id) =>
                        setSelected((s) => {
                          const n = new Set(s);
                          if (n.has(id)) n.delete(id);
                          else n.add(id);
                          return n;
                        })
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="absolute" style={{ left: BENTO_X, top: TOP - 4 }}>
              <BentoPanel
                width={BENTO_W}
                title="Project bento"
                badge={sources.length ? `From ${sources.length} moodboard${sources.length === 1 ? "" : "s"}` : ""}
                allowStarter={false}
                emptyTitle="Build the project bento"
                emptyBody="Click images in the moodboards to select them, then add them here. You can drag them across too."
                tiles={doc.tiles}
                images={images}
                starter="hero-left"
                showPicker={false}
                canEdit={data.canEdit}
                hasReferences={false}
                onShuffle={() =>
                  relayout(bentoIds(), {
                    seed: Math.floor(Math.random() * 1e9),
                  })
                }
                onStarter={() => {}}
                onLock={lock}
                onRemove={remove}
                onReplace={setReplacing}
                onOpen={() => {}}
                onDropImages={addToBento}
                onAddAll={() => {}}
                toast={showToast}
                footer={
                  sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {sources.map((s) => (
                        <Badge key={s}>{s}</Badge>
                      ))}
                    </div>
                  )
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating chrome */}
      <div className="absolute left-4 top-4" data-menu>
        <CanvasNavLeft parent={shared ? `Shared by ${shared.by}` : undefined} current={data.name} onMenu={() => setMenuOpen((o) => !o)} />
        {menuOpen && (
          <div className="absolute left-0 top-[60px] z-30">
            <Menu>
              <MenuItem icon="grid" onSelect={() => router.push(shared && !shared.signedIn ? "/" : "/home")}>
                {shared && !shared.signedIn ? "Depod home" : "Home"}
              </MenuItem>
              {!shared && (
                <MenuItem icon="folder" onSelect={() => router.push("/projects")}>
                  Projects
                </MenuItem>
              )}
              {data.canEdit && api.createMoodboard && (
                <MenuItem icon="plus" onSelect={() => (setMenuOpen(false), setDialog("new"))}>
                  Add moodboard
                </MenuItem>
              )}
            </Menu>
          </div>
        )}
      </div>
      <div className="absolute right-4 top-4">
        {shared ? (
          <SharedNavRight signedIn={shared.signedIn} initials={shared.initials} signInHref={shared.signInHref} />
        ) : (
          <CanvasNavRight people={data.people} secondaryLabel="Share" primaryLabel={null} onSecondary={() => setDialog("share")} />
        )}
      </div>
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3">
        {selected.size > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-surface-raised py-1.5 pl-4 pr-1.5 shadow-float">
            <span className="whitespace-nowrap text-label-13 text-text-primary">{selected.size} selected</span>
            <Button variant="ghost" size="small" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button size="small" leadingIcon="plus" onClick={() => addToBento([...selected])}>
              Add to project bento
            </Button>
          </div>
        )}
        {toast && <Toast message={toast} />}
        <Toolbar
          active={tool}
          only={shared ? ["hand"] : ["select", "hand", "comment"]}
          onChange={(t) => {
            if (t === "comment") return showToast("Comments come with teams.");
            setTool(t);
          }}
        />
      </div>
      {!empty && (
        <div className="absolute bottom-6 right-4">
          <Zoom percent={Math.round(view.zoom * 100)} onIn={zoomIn} onOut={zoomOut} />
        </div>
      )}

      {replacing && (
        <ReplaceImage
          candidates={[...images.values()].filter((i) => i.id !== replacing)}
          onClose={() => setReplacing(null)}
          onPick={(id) => replaceTile(replacing, id)}
        />
      )}
      {dialog === "share" && (
        <ShareDialog name={data.name} state={share} api={api.share} canEdit={data.canEdit} onChange={setShare} onClose={() => setDialog(null)} />
      )}
      {dialog === "new" && api.createMoodboard && (
        <NewMoodboardDialog
          projects={[{ id: data.id, name: data.name }]}
          defaultProjectId={data.id}
          onClose={() => setDialog(null)}
          onCreate={(name) => api.createMoodboard!(name)}
        />
      )}
    </div>
  );
}
