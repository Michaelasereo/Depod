"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { arrange, setLocked, type StarterLayout, type Tile } from "@/lib/bento/layout";
import type { BentoDoc } from "@/lib/bento/doc";
import { isImage, prepare, type Prepared } from "@/lib/upload/prepare";
import { takeParkedFiles } from "@/lib/upload/pending";
import { Menu, MenuDivider, MenuItem } from "../ui/overlays";
import { DeleteMoodboardDialog, PlanLimitDialog } from "../app/moodboard-dialogs";
import { ExportDialog } from "./ExportDialog";
import { ShareDialog } from "./ShareDialog";
import { Toast } from "../ui/display";
import { CanvasNavLeft, CanvasNavRight, SharedNavRight, Toolbar, Zoom, type CanvasTool } from "./chrome";
import { References, REF_WIDTH, masonry } from "./References";
import { BentoPanel, BENTO_WIDTH, GAP, ROW_H } from "./BentoPanel";
import { DeleteImagesDialog, DuplicateDialog, ImageDetail, ReplaceImage } from "./dialogs";
import { useViewport } from "./useViewport";
import { PlanLimitError, type CanvasImage, type MoodboardApi, type MoodboardData } from "./types";

/*
 * The moodboard canvas (Figma 4 · Moodboard editor).
 * World layout follows the Figma frame: References at (48, 96), the bento at (664, 96), 1440 wide.
 * The bento is arranged by the layout engine; every change is saved (debounced) through `api`.
 */
const WORLD_W = 1440;
const REF_X = 48;
const BENTO_X = 664;
const TOP = 96;
const UPLOAD_CONCURRENCY = 3;

type Pending = { files: Prepared[]; dupes: number };

/** 08 / 08b: someone opened a share link. Read-only, Hand tool only. */
export type SharedMode = {
  by: string;
  signedIn: boolean;
  initials?: string;
  signInHref: string;
};

export function MoodboardCanvas({ data, api, shared }: { data: MoodboardData; api: MoodboardApi; shared?: SharedMode }) {
  const router = useRouter();
  const [images, setImages] = useState<CanvasImage[]>(data.images);
  const [doc, setDoc] = useState<BentoDoc>(data.doc);
  const [starter, setStarter] = useState<StarterLayout>(data.starter);
  const [picked, setPicked] = useState(data.images.length > 0 || data.doc.tiles.length > 0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tool, setTool] = useState<CanvasTool>(shared ? "hand" : "select");
  const [detail, setDetail] = useState<string | null>(null);
  const [replacing, setReplacing] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dropCount, setDropCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<"export" | "delete" | "limit" | "share" | null>(null);
  const [share, setShare] = useState(data.share);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const failedFiles = useRef(new Map<string, Prepared>());
  const fileInput = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const byId = useMemo(() => new Map(images.map((i) => [i.id, i])), [images]);
  const inBento = useMemo(() => new Set(doc.tiles.map((t) => t.imageId)), [doc.tiles]);

  // ── Saving ────────────────────────────────────────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const save = useCallback(
    (next: BentoDoc) => {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        api.saveBento(next).catch(() => showToast("Couldn't save. Check your connection."));
      }, 400);
    },
    [api, showToast],
  );

  /** Re-runs the layout engine for these bento images and saves. Locked tiles stay. */
  const relayout = useCallback(
    (ids: string[], opts: { seed?: number; starter?: StarterLayout; previous?: Tile[] } = {}) => {
      setDoc((d) => {
        const list = ids.map((id) => byId.get(id)).filter((i): i is CanvasImage => !!i && !i.status);
        const seed = opts.seed ?? d.seed;
        const tiles = arrange(
          list.map((i) => ({ id: i.id, ratio: i.width / i.height })),
          {
            starter: opts.starter ?? starter,
            seed,
            previous: opts.previous ?? d.tiles,
          },
        );
        const next: BentoDoc = { v: 1, seed, tiles };
        save(next);
        return next;
      });
    },
    [byId, starter, save],
  );

  const bentoIds = () => doc.tiles.map((t) => t.imageId);
  const addToBento = (ids: string[]) => {
    const fresh = ids.filter((id) => !inBento.has(id) && byId.get(id) && !byId.get(id)!.status);
    if (!fresh.length) return;
    relayout([...bentoIds(), ...fresh]);
    setSelected(new Set());
  };
  const removeFromBento = (id: string) =>
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
  const shuffle = () => relayout(bentoIds(), { seed: Math.floor(Math.random() * 1e9) });
  const changeStarter = (s: StarterLayout) => {
    setStarter(s);
    setPicked(true);
    api.setStarter(s).catch(() => showToast("Couldn't save. Check your connection."));
    if (doc.tiles.length)
      relayout(bentoIds(), {
        starter: s,
        previous: doc.tiles.filter((t) => t.locked),
      });
  };

  /** 20b: the tile keeps its cells and lock; only the image changes. */
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

  /** Deletes images from References (and the bento): 20e, and Delete from References in 29. */
  const deleteImages = async (ids: string[]) => {
    setDetail(null);
    setConfirmDelete(false);
    setSelected(new Set());
    const gone = new Set(ids);
    const remaining = bentoIds().filter((x) => !gone.has(x));
    if (remaining.length !== doc.tiles.length)
      relayout(remaining, {
        previous: doc.tiles.filter((t) => !gone.has(t.imageId)),
      });
    setImages((list) => list.filter((i) => !gone.has(i.id)));
    const results = await Promise.allSettled(ids.map((id) => api.deleteImage(id)));
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed) showToast(`Couldn't delete ${failed} image${failed === 1 ? "" : "s"}. Try again.`);
  };
  const deleteImage = (id: string) => deleteImages([id]);

  // ── Uploads (14, 40a–c) ───────────────────────────────────────────────────
  const uploadPrepared = useCallback(
    async (files: Prepared[]): Promise<CanvasImage[]> => {
      const temps = files.map((f) => ({
        id: `tmp-${crypto.randomUUID()}`,
        url: URL.createObjectURL(f.blob),
        width: f.width,
        height: f.height,
        name: f.name,
        hash: f.hash,
        status: "uploading" as const,
      }));
      setImages((list) => [...list, ...temps]);
      setProgress((p) => ({
        done: p?.done ?? 0,
        total: (p?.total ?? 0) + files.length,
      }));
      const done: CanvasImage[] = [];
      let next = 0;
      const worker = async () => {
        while (next < files.length) {
          const i = next++;
          const temp = temps[i];
          try {
            const saved = await api.upload(files[i]);
            done.push(saved);
            setImages((list) => list.map((x) => (x.id === temp.id ? { ...saved, url: temp.url } : x)));
          } catch (err) {
            if (err instanceof PlanLimitError) {
              // The server said no (19): drop the placeholder and say why.
              setImages((list) => list.filter((x) => x.id !== temp.id));
              setDialog("limit");
              setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
              continue;
            }
            failedFiles.current.set(temp.id, files[i]);
            setImages((list) => list.map((x) => (x.id === temp.id ? { ...x, status: "failed" } : x)));
          }
          setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
        }
      };
      await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, worker));
      setProgress((p) => (p && p.done >= p.total ? null : p));
      return done;
    },
    [api],
  );

  const takeFiles = useCallback(
    async (list: File[]) => {
      if (!data.canEdit) return;
      const imgs = list.filter(isImage);
      const skipped = list.length - imgs.length;
      if (skipped) showToast(`${skipped} file${skipped === 1 ? "" : "s"} skipped: not images`);
      if (!imgs.length) return;
      if (!picked) setPicked(true);
      const prepared: Prepared[] = [];
      for (const f of imgs) {
        try {
          prepared.push(await prepare(f));
        } catch {
          showToast(`Couldn't read ${f.name}.`);
        }
      }
      // 19: Free moodboards hold 50 images. Add what fits, then explain.
      if (data.imageLimit != null) {
        const room = data.imageLimit - images.filter((i) => i.status !== "failed").length;
        if (prepared.length > room) {
          prepared.splice(Math.max(room, 0));
          setDialog("limit");
        }
        if (!prepared.length) return;
      }
      const known = new Set(images.map((i) => i.hash).filter(Boolean));
      // Duplicates of images already in References, or repeated within this drop.
      const dupes = prepared.filter((p) => (known.has(p.hash) ? true : (known.add(p.hash), false))).length;
      if (dupes) setPending({ files: prepared, dupes });
      else uploadPrepared(prepared);
    },
    [data.canEdit, data.imageLimit, images, picked, showToast, uploadPrepared],
  );

  // Files dropped on Home come along to the new moodboard.
  const parkedTaken = useRef(false);
  useEffect(() => {
    if (parkedTaken.current) return;
    parkedTaken.current = true;
    const files = takeParkedFiles(data.id);
    if (files.length) queueMicrotask(() => takeFiles(files));
  }, [data.id, takeFiles]);

  // Close the nav menu on any outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => !(e.target as HTMLElement).closest?.("[data-menu]") && setMenuOpen(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const retry = (id: string) => {
    const f = failedFiles.current.get(id);
    if (!f) return;
    failedFiles.current.delete(id);
    setImages((list) => list.filter((i) => i.id !== id));
    uploadPrepared([f]);
  };

  // Paste anywhere on the page.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input, textarea")) return;
      const files = [...(e.clipboardData?.files ?? [])];
      if (files.length) {
        e.preventDefault();
        takeFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [takeFiles]);

  // ── Viewport ──────────────────────────────────────────────────────────────
  const refHeight = 56 + Math.max(masonry(images).height + 20, 624);
  const bentoRows = doc.tiles.reduce((m, t) => Math.max(m, t.y + t.h), 0);
  const bentoH = 40 + (bentoRows ? bentoRows * (ROW_H + GAP) - GAP + 24 : 640);
  const worldH = TOP + Math.max(refHeight, bentoH) + 140;
  const { ref: viewportRef, view, panning, grab, zoomIn, zoomOut, handlers } = useViewport({ width: WORLD_W, height: Math.min(worldH, 900) }, tool === "hand");

  const ready = images.filter((i) => !i.status);

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-bg-canvas"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files") || !data.canEdit) return;
        e.preventDefault();
        setDropCount(e.dataTransfer.items.length);
      }}
      onDragLeave={(e) => e.relatedTarget === null && setDropCount(0)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDropCount(0);
        takeFiles([...e.dataTransfer.files]);
      }}
    >
      {/* The canvas */}
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
          <div className="absolute" style={{ left: REF_X, top: TOP, width: REF_WIDTH }}>
            <References
              images={images}
              inBento={inBento}
              selected={selected}
              canEdit={data.canEdit}
              onToggle={(id) =>
                setSelected((s) => {
                  const n = new Set(s);
                  if (n.has(id)) n.delete(id);
                  else n.add(id);
                  return n;
                })
              }
              onClear={() => setSelected(new Set())}
              onAddSelected={() => addToBento([...selected])}
              onDeleteSelected={() => setConfirmDelete(true)}
              onAddAll={() => addToBento(ready.map((i) => i.id))}
              onBrowse={() => fileInput.current?.click()}
              onOpen={setDetail}
              onRetry={retry}
            />
          </div>
          <div className="absolute" style={{ left: BENTO_X, top: TOP + 8, width: BENTO_WIDTH }}>
            <BentoPanel
              tiles={doc.tiles}
              images={byId}
              starter={starter}
              showPicker={!picked}
              canEdit={data.canEdit}
              hasReferences={ready.length > 0}
              onShuffle={shuffle}
              onStarter={changeStarter}
              onLock={lock}
              onRemove={removeFromBento}
              onReplace={setReplacing}
              onOpen={setDetail}
              onDropImages={addToBento}
              onAddAll={() => addToBento(ready.map((i) => i.id))}
              toast={showToast}
            />
          </div>
        </div>
      </div>

      {/* Floating chrome */}
      <div className="absolute left-4 top-4" data-menu>
        <CanvasNavLeft parent={shared ? `Shared by ${shared.by}` : data.projectName} current={data.name} onMenu={() => setMenuOpen((o) => !o)} />
        {menuOpen && (
          <div className="absolute left-0 top-[60px] z-30">
            <Menu>
              <MenuItem icon="grid" onSelect={() => (setMenuOpen(false), router.push(shared && !shared.signedIn ? "/" : "/home"))}>
                {shared && !shared.signedIn ? "Depod home" : "Home"}
              </MenuItem>
              {api.deleteMoodboard && data.canEdit && (
                <>
                  <MenuDivider />
                  <MenuItem icon="trash" danger onSelect={() => (setMenuOpen(false), setDialog("delete"))}>
                    Delete moodboard
                  </MenuItem>
                </>
              )}
            </Menu>
          </div>
        )}
      </div>
      <div className="absolute right-4 top-4">
        {shared ? (
          <SharedNavRight signedIn={shared.signedIn} initials={shared.initials} signInHref={shared.signInHref} />
        ) : (
          <CanvasNavRight
            people={data.people}
            secondaryLabel="Share"
            primaryLabel="Export"
            onSecondary={() => (api.share && share ? setDialog("share") : showToast("Sign in to share this moodboard."))}
            onPrimary={() => (doc.tiles.length ? setDialog("export") : showToast("Add images to the bento to export it."))}
          />
        )}
      </div>
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3">
        {progress && progress.total > 1 && <Toast message={`Uploading ${Math.min(progress.done + 1, progress.total)} of ${progress.total}`} />}
        {toast && <Toast message={toast} />}
        <Toolbar
          active={tool}
          only={shared ? ["hand"] : ["select", "hand", "images", "comment"]}
          onChange={(t) => {
            if (t === "images") return fileInput.current?.click();
            if (t === "comment") return showToast("Comments come with teams.");
            setTool(t);
          }}
        />
      </div>
      <div className="absolute bottom-6 right-4">
        <Zoom percent={Math.round(view.zoom * 100)} onIn={zoomIn} onOut={zoomOut} />
      </div>

      <input
        ref={fileInput}
        type="file"
        multiple
        accept="image/*,.heic,.heif"
        hidden
        onChange={(e) => {
          takeFiles([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />

      {/* 14: drop overlay */}
      {dropCount > 0 && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-bg-overlay">
          <span className="rounded-xl bg-bg-inverse px-4 py-3 text-label-13 text-text-inverse shadow-float">
            Drop to add {dropCount} image{dropCount === 1 ? "" : "s"} to References
          </span>
        </div>
      )}

      {detail && byId.get(detail) && (
        <ImageDetail
          img={byId.get(detail)!}
          inBento={inBento.has(detail)}
          canEdit={data.canEdit}
          onClose={() => setDetail(null)}
          onReplace={() => (setReplacing(detail), setDetail(null))}
          onRemove={() => (removeFromBento(detail), setDetail(null))}
          onDelete={() => deleteImage(detail)}
        />
      )}

      {replacing && (
        <ReplaceImage
          candidates={ready.filter((i) => i.id !== replacing)}
          onClose={() => setReplacing(null)}
          onPick={(id) => replaceTile(replacing, id)}
          onFile={async (file) => {
            const target = replacing;
            setReplacing(null);
            try {
              const [saved] = await uploadPrepared([await prepare(file)]);
              if (saved) replaceTile(target, saved.id);
            } catch {
              showToast(`Couldn't read ${file.name}.`);
            }
          }}
        />
      )}

      {confirmDelete && selected.size > 0 && (
        <DeleteImagesDialog count={selected.size} onDelete={() => deleteImages([...selected])} onCancel={() => setConfirmDelete(false)} />
      )}

      {dialog === "export" && (
        <ExportDialog tiles={doc.tiles} images={byId} fileName={data.name} markLocked={data.markLocked} onClose={() => setDialog(null)} />
      )}
      {dialog === "delete" && api.deleteMoodboard && (
        <DeleteMoodboardDialog name={data.name} imageCount={ready.length} onDelete={api.deleteMoodboard} onClose={() => setDialog(null)} />
      )}
      {dialog === "share" && api.share && share && (
        <ShareDialog name={data.name} state={share} api={api.share} canEdit={data.canEdit} onChange={setShare} onClose={() => setDialog(null)} />
      )}
      {dialog === "limit" && <PlanLimitDialog kind="images" plan={data.plan} onClose={() => setDialog(null)} />}

      {pending && (
        <DuplicateDialog
          count={pending.dupes}
          onAdd={() => (uploadPrepared(pending.files), setPending(null))}
          onSkip={() => {
            const known = new Set(images.map((i) => i.hash));
            const rest = pending.files.filter((f) => (known.has(f.hash) ? false : (known.add(f.hash), true)));
            if (rest.length) uploadPrepared(rest);
            setPending(null);
          }}
        />
      )}
    </div>
  );
}
