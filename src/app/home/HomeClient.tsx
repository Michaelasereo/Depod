"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { MoodboardCard } from "@/components/app/app";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/controls";
import { EmptyState, Menu, MenuDivider, MenuItem } from "@/components/ui/overlays";
import { DeleteMoodboardDialog, MoveDialog, NewMoodboardDialog, PlanLimitDialog } from "@/components/app/moodboard-dialogs";
import { isImage } from "@/lib/upload/prepare";
import { parkFiles } from "@/lib/upload/pending";
import type { LIMITS, Plan } from "@/lib/data/plans";
import { createMoodboard, deleteMoodboard, moveMoodboard } from "./actions";

export type HomeBoard = {
  id: string;
  name: string;
  projectId: string | null;
  mine: boolean;
  createdAt: string;
  updatedAt: string;
  imageCount: number;
  thumbs: string[];
};

type Filter = "all" | "mine" | "shared" | string; // a project id
type Sort = "edited" | "created" | "name";
const SORTS: Array<[Sort, string]> = [
  ["edited", "Last edited"],
  ["created", "Date created"],
  ["name", "Name"],
];

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return m <= 1 ? "just now" : `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.round(d / 7)}w ago`;
  return `${Math.round(d / 30)}mo ago`;
};

const greetingFor = (h: number) => (h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
const subscribe = () => () => {};

export function HomeClient({
  firstName,
  boards,
  projects,
  limits,
  plan,
}: {
  firstName: string;
  workspaceId: string;
  boards: HomeBoard[];
  projects: Array<{ id: string; name: string }>;
  limits: (typeof LIMITS)[Plan];
  plan: Plan;
}) {
  const router = useRouter();
  // The greeting follows the visitor's clock, so it renders on the client only.
  const hour = useSyncExternalStore(subscribe, () => new Date().getHours(), () => -1);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("edited");
  const [sortOpen, setSortOpen] = useState(false);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [dialog, setDialog] = useState<null | { kind: "new" } | { kind: "move" | "delete"; id: string } | { kind: "limit" }>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const first = boards.length === 0;
  const atLimit = limits.moodboards !== null && boards.length >= limits.moodboards;

  const shown = useMemo(() => {
    const list = boards.filter((b) =>
      filter === "all" ? true : filter === "mine" ? b.mine : filter === "shared" ? !b.mine : b.projectId === filter,
    );
    return list.sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name) : sort === "created" ? b.createdAt.localeCompare(a.createdAt) : b.updatedAt.localeCompare(a.updatedAt),
    );
  }, [boards, filter, sort]);

  const create = async (name: string, projectId: string | null, files?: File[]) => {
    if (atLimit) return void setDialog({ kind: "limit" });
    const res = await createMoodboard(name, projectId);
    if (!res.ok) {
      if (res.error === "limit") return void setDialog({ kind: "limit" });
      return "We couldn't create the moodboard. Try again.";
    }
    if (files?.length) parkFiles(res.id, files);
    router.push(`/m/${res.id}`);
  };

  /** Drop, paste or browse on Home: a new moodboard opens with these images uploading into References. */
  const startWith = async (files: File[]) => {
    const imgs = files.filter(isImage);
    if (!imgs.length || busy) return;
    setBusy(true);
    await create("Untitled moodboard", null, imgs);
    setBusy(false);
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input, textarea") || dialog) return;
      const files = [...(e.clipboardData?.files ?? [])];
      if (files.length) {
        e.preventDefault();
        startWith(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  useEffect(() => {
    if (!menu && !sortOpen) return;
    const close = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest?.("[data-menu]")) {
        setMenu(null);
        setSortOpen(false);
      }
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menu, sortOpen]);

  const target = dialog && "id" in dialog ? boards.find((b) => b.id === dialog.id) : undefined;

  return (
    <main className="mx-auto flex max-w-[1440px] flex-col gap-8 px-12 pb-20 pt-14">
      <h1 className="text-display-40">
        <span className="block text-text-primary">{hour < 0 ? " " : first ? `Welcome to Depod, ${firstName}.` : `${greetingFor(hour)}, ${firstName}.`}</span>
        <span className="block text-text-tertiary">{first ? "Start with a few images." : "Pick up where you left off."}</span>
      </h1>

      {/* Drop zone */}
      <section
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          startWith([...e.dataTransfer.files]);
        }}
        className={cn(
          "flex items-center justify-between gap-6 rounded-3xl border-[1.5px] border-dashed px-8 py-8",
          over ? "border-border-focus bg-bg-hover" : "border-border-strong bg-bg-subtle",
          first && "py-14",
        )}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-heading-20 text-text-primary">{busy ? "Starting your moodboard…" : "Drop images to start a moodboard"}</h2>
          <p className="text-body-15 text-text-secondary">Or paste from Pinterest, screenshots or your files.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" leadingIcon="upload" disabled={busy} onClick={() => input.current?.click()}>
            Browse files
          </Button>
          <Button leadingIcon="plus" disabled={busy} onClick={() => (atLimit ? setDialog({ kind: "limit" }) : setDialog({ kind: "new" }))}>
            New moodboard
          </Button>
        </div>
        <input
          ref={input}
          type="file"
          multiple
          accept="image/*,.heic,.heif"
          hidden
          onChange={(e) => {
            startWith([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </section>

      {!first && (
        <>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <Chip selected={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
              <Chip selected={filter === "mine"} onClick={() => setFilter("mine")}>Mine</Chip>
              <Chip selected={filter === "shared"} onClick={() => setFilter("shared")}>Shared with me</Chip>
              {projects.map((p) => (
                <Chip key={p.id} selected={filter === p.id} onClick={() => setFilter(p.id)}>
                  {p.name}
                </Chip>
              ))}
            </div>
            <div className="relative" data-menu>
              <Button variant="ghost" size="small" trailingIcon="chevron-down" onClick={() => setSortOpen(!sortOpen)}>
                {SORTS.find(([k]) => k === sort)![1]}
              </Button>
              {sortOpen && (
                <div className="absolute right-0 top-9 z-20">
                  <Menu>
                    {SORTS.map(([k, label]) => (
                      <MenuItem key={k} checked={sort === k} onSelect={() => (setSort(k), setSortOpen(false))}>
                        {label}
                      </MenuItem>
                    ))}
                  </Menu>
                </div>
              )}
            </div>
          </div>

          {shown.length === 0 ? (
            <div className="flex justify-center py-12">
              <EmptyState illustration="filter-none" title="Nothing here" body="No moodboards match this filter." actionLabel="Clear filter" onAction={() => setFilter("all")} />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shown.map((b) => (
                <MoodboardCard
                  key={b.id}
                  href={`/m/${b.id}`}
                  name={b.name}
                  details={`Edited ${ago(b.updatedAt)} · ${b.imageCount} image${b.imageCount === 1 ? "" : "s"}`}
                  images={b.thumbs}
                  onMore={(r) => setMenu({ id: b.id, x: r.right, y: r.bottom + window.scrollY + 4 })}
                />
              ))}
            </div>
          )}
        </>
      )}

      {menu && (
        <div data-menu className="absolute z-30" style={{ left: menu.x - 234, top: menu.y }}>
          <Menu>
            <MenuItem icon="arrow-right" onSelect={() => router.push(`/m/${menu.id}`)}>Open</MenuItem>
            <MenuItem icon="folder" onSelect={() => (setDialog({ kind: "move", id: menu.id }), setMenu(null))}>Move to…</MenuItem>
            <MenuDivider />
            <MenuItem icon="trash" danger onSelect={() => (setDialog({ kind: "delete", id: menu.id }), setMenu(null))}>Delete</MenuItem>
          </Menu>
        </div>
      )}

      {dialog?.kind === "new" && <NewMoodboardDialog projects={projects} onClose={() => setDialog(null)} onCreate={(n, p) => create(n, p)} />}
      {dialog?.kind === "limit" && <PlanLimitDialog kind="moodboards" plan={plan} onClose={() => setDialog(null)} />}
      {dialog?.kind === "move" && target && (
        <MoveDialog
          name={target.name}
          currentProjectId={target.projectId}
          projects={projects}
          onClose={() => setDialog(null)}
          onMove={async (pid) => {
            await moveMoodboard(target.id, pid);
            setDialog(null);
            router.refresh();
          }}
        />
      )}
      {dialog?.kind === "delete" && target && (
        <DeleteMoodboardDialog
          name={target.name}
          imageCount={target.imageCount}
          onClose={() => setDialog(null)}
          onDelete={async (typed) => {
            const res = await deleteMoodboard(target.id, typed);
            if (!res.ok) return res.error === "name" ? "The name doesn't match." : "We couldn't delete it. Try again.";
            setDialog(null);
            router.refresh();
          }}
        />
      )}
    </main>
  );
}
