"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon } from "../icon/Icon";
import { Input } from "../ui/controls";
import { Modal } from "../ui/overlays";

/* Moodboard dialogs shared by Home and the canvas: 18 New moodboard, 38 Move, 30 Delete, 19 Plan limit. */

export function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      {children}
    </div>
  );
}

type Project = { id: string; name: string };

/* 18 New moodboard: Name and Project. */
export function NewMoodboardDialog({
  projects,
  onCreate,
  onClose,
}: {
  projects: Project[];
  onCreate: (name: string, projectId: string | null) => Promise<string | void>;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <Overlay onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          start(async () => {
            const err = await onCreate(String(f.get("name") ?? ""), String(f.get("project") ?? "") || null);
            if (err) setError(err);
          });
        }}
      >
        <Modal title="New moodboard" secondaryLabel="Cancel" onSecondary={onClose} primaryLabel={pending ? "Creating…" : "Create moodboard"} primaryType="submit" onClose={onClose}>
          <label className="flex flex-col gap-2">
            <span className="text-label-13 text-text-primary">Name</span>
            <Input name="name" placeholder="Spring campaign" autoFocus maxLength={120} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-label-13 text-text-primary">Project</span>
            <span className="flex h-10 items-center gap-2 rounded-[10px] border border-border-strong bg-bg-surface px-3 text-body-15">
              <Icon name="folder" className="text-icon-secondary" />
              <select name="project" defaultValue="" className="min-w-0 flex-1 appearance-none bg-transparent text-text-primary outline-none">
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Icon name="chevron-down" size={16} className="text-icon-secondary" />
            </span>
          </label>
          {error && <p className="text-caption-12 text-text-danger">{error}</p>}
        </Modal>
      </form>
    </Overlay>
  );
}

/* 38 Move moodboard to a project. */
export function MoveDialog({
  name,
  currentProjectId,
  projects,
  onMove,
  onClose,
}: {
  name: string;
  currentProjectId: string | null;
  projects: Project[];
  onMove: (projectId: string | null) => Promise<void>;
  onClose: () => void;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const options: Array<{ id: string | null; name: string }> = [...projects, { id: null, name: "No project" }];
  return (
    <Overlay onClose={onClose}>
      <Modal
        title={`Move ${name} to…`}
        secondaryLabel="Cancel"
        onSecondary={onClose}
        primaryLabel="Move"
        onPrimary={() => choice !== null && choice !== currentProjectId && start(() => onMove(choice === "" ? null : choice))}
        onClose={onClose}
      >
        <div role="radiogroup" className="flex flex-col gap-1">
          {options.map((p) => {
            const value = p.id ?? "";
            const current = (p.id ?? null) === currentProjectId;
            const on = choice === value;
            return (
              <button
                key={value || "none"}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={current || pending}
                onClick={() => setChoice(value)}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-[10px] px-3 text-left text-body-15",
                  on && "bg-bg-subtle",
                  current ? "text-text-tertiary" : "text-text-primary hover:bg-bg-hover",
                )}
              >
                <span className={cn("size-[18px] shrink-0 rounded-full bg-bg-surface", on ? "border-[5px] border-border-focus" : "border-[1.5px] border-border-strong")} />
                {p.name}
                {current && " (current)"}
              </button>
            );
          })}
        </div>
      </Modal>
    </Overlay>
  );
}

/* 30 Delete moodboard: type the name to confirm. */
export function DeleteMoodboardDialog({
  name,
  imageCount,
  onDelete,
  onClose,
}: {
  name: string;
  imageCount: number;
  onDelete: (typed: string) => Promise<string | void>;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const ok = typed.trim() === name.trim();
  return (
    <Overlay onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!ok) return;
          start(async () => {
            const err = await onDelete(typed);
            if (err) setError(err);
          });
        }}
      >
        <Modal
          title={`Delete ${name}?`}
          body={`This deletes its ${imageCount} image${imageCount === 1 ? "" : "s"}, the bento and all comments. This can't be undone.`}
          secondaryLabel="Cancel"
          onSecondary={onClose}
          primaryLabel={pending ? "Deleting…" : "Delete moodboard"}
          primaryVariant="danger"
          primaryType="submit"
          onClose={onClose}
        >
          <label className="flex flex-col gap-2">
            <span className="text-label-13 text-text-primary">Type the moodboard name to confirm</span>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={name} autoFocus autoComplete="off" />
          </label>
          {error && <p className="text-caption-12 text-text-danger">{error}</p>}
        </Modal>
      </form>
    </Overlay>
  );
}

/* 19 Plan limit reached (images), and the same shape for moodboards. */
export function PlanLimitDialog({ kind, plan, onClose }: { kind: "images" | "moodboards"; plan: string; onClose: () => void }) {
  const router = useRouter();
  const copy =
    kind === "images"
      ? { title: "You've reached 50 images", body: "Free moodboards hold 50 images each. Upgrade to Pro for 500 per moodboard, or remove a few to keep adding." }
      : { title: "You've reached 3 moodboards", body: "The Free plan holds 3 moodboards. Upgrade to Pro for unlimited moodboards, or delete one to start another." };
  return (
    <Overlay onClose={onClose}>
      <Modal
        title={copy.title}
        body={plan === "free" ? copy.body : "You've reached this plan's limit. Remove a few to keep adding."}
        secondaryLabel="Not now"
        onSecondary={onClose}
        primaryLabel="See plans"
        onPrimary={() => router.push("/pricing")}
        onClose={onClose}
      />
    </Overlay>
  );
}
