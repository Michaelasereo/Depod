"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ago, plural } from "@/lib/format";
import { ProjectCard } from "@/components/app/app";
import { Button } from "@/components/ui/Button";
import { EmptyState, Menu, MenuDivider, MenuItem } from "@/components/ui/overlays";
import { DeleteProjectDialog, NewProjectDialog } from "@/components/app/project-dialogs";
import { Toast } from "@/components/ui/display";
import { createProject, deleteProject, renameProject } from "./actions";

export type ProjectRow = { id: string; name: string; boardCount: number; editedAt: string; thumbs: string[] };

/* Figma 36, 36b, 37a New, 37b Rename (inline on the card), 37c Delete. */
export function ProjectsClient({ projects, isOwner, canEdit }: { projects: ProjectRow[]; isOwner: boolean; canEdit: boolean }) {
  const router = useRouter();
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [dialog, setDialog] = useState<null | { kind: "new" } | { kind: "delete"; id: string }>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => !(e.target as HTMLElement).closest?.("[data-menu]") && setMenu(null);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menu]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const rename = async (id: string, value: string | null) => {
    setRenaming(null);
    const old = projects.find((p) => p.id === id)!.name;
    if (value === null || !value.trim() || value.trim() === (names[id] ?? old)) return;
    setNames((n) => ({ ...n, [id]: value.trim() }));
    const r = await renameProject(id, value);
    if (!r.ok) {
      setNames((n) => ({ ...n, [id]: old }));
      setToast("Couldn't rename the project. Try again.");
    }
  };

  const target = dialog?.kind === "delete" ? projects.find((p) => p.id === dialog.id) : undefined;

  return (
    <main className="mx-auto flex max-w-[1440px] flex-col gap-8 px-12 pb-20 pt-14">
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-display-40 text-text-primary">Projects</h1>
          <p className="text-body-15 text-text-secondary">{projects.length ? plural(projects.length, "project") : "Group the moodboards for one piece of work."}</p>
        </div>
        {canEdit && (
          <Button leadingIcon="plus" onClick={() => setDialog({ kind: "new" })}>
            New project
          </Button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="flex justify-center pt-10">
          <EmptyState
            illustration="projects-none"
            title="No projects yet"
            body="Group the moodboards for one piece of work into a project."
            actionLabel={canEdit ? "New project" : undefined}
            onAction={() => setDialog({ kind: "new" })}
          />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              href={`/p/${p.id}`}
              name={names[p.id] ?? p.name}
              details={`${plural(p.boardCount, "moodboard")} · edited ${ago(p.editedAt)}`}
              images={p.thumbs}
              editing={renaming === p.id}
              onRename={(v) => rename(p.id, v)}
              onMore={(r) => setMenu({ id: p.id, x: r.right, y: r.bottom + window.scrollY + 4 })}
            />
          ))}
        </div>
      )}

      {menu && (
        <div data-menu className="absolute z-30" style={{ left: menu.x - 234, top: menu.y }}>
          <Menu>
            <MenuItem icon="arrow-right" onSelect={() => router.push(`/p/${menu.id}`)}>
              Open
            </MenuItem>
            {canEdit && (
              <MenuItem icon="note" onSelect={() => (setRenaming(menu.id), setMenu(null))}>
                Rename
              </MenuItem>
            )}
            {isOwner && (
              <>
                <MenuDivider />
                <MenuItem icon="trash" danger onSelect={() => (setDialog({ kind: "delete", id: menu.id }), setMenu(null))}>
                  Delete
                </MenuItem>
              </>
            )}
          </Menu>
        </div>
      )}

      {dialog?.kind === "new" && (
        <NewProjectDialog
          onClose={() => setDialog(null)}
          onCreate={async (name) => {
            const r = await createProject(name);
            if (!r.ok) return "We couldn't create the project. Try again.";
            router.push(`/p/${r.id}`);
          }}
        />
      )}
      {target && (
        <DeleteProjectDialog
          name={names[target.id] ?? target.name}
          boardCount={target.boardCount}
          onClose={() => setDialog(null)}
          onDelete={async (typed) => {
            const r = await deleteProject(target.id, typed);
            if (!r.ok) return r.error === "name" ? "That name doesn't match." : r.error === "owner" ? "Only owners can delete projects." : "Couldn't delete. Try again.";
            setDialog(null);
            router.refresh();
          }}
        />
      )}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
          <Toast message={toast} />
        </div>
      )}
    </main>
  );
}
