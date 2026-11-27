"use client";

import { useState, useTransition } from "react";
import { Input } from "../ui/controls";
import { Modal } from "../ui/overlays";
import { Overlay } from "./moodboard-dialogs";

/* 37a New project. */
export function NewProjectDialog({ onCreate, onClose }: { onCreate: (name: string) => Promise<string | void>; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <Overlay onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const name = String(new FormData(e.currentTarget).get("name") ?? "");
          start(async () => {
            const err = await onCreate(name);
            if (err) setError(err);
          });
        }}
      >
        <Modal title="New project" secondaryLabel="Cancel" onSecondary={onClose} primaryLabel={pending ? "Creating…" : "Create project"} primaryType="submit" onClose={onClose}>
          <label className="flex flex-col gap-2">
            <span className="text-label-13 text-text-primary">Name</span>
            <Input name="name" placeholder="Spring launch" autoFocus maxLength={120} />
          </label>
          {error && <p className="text-caption-12 text-text-danger">{error}</p>}
        </Modal>
      </form>
    </Overlay>
  );
}

/* 37c Delete project: type the name to confirm. Owners only. */
export function DeleteProjectDialog({
  name,
  boardCount,
  onDelete,
  onClose,
}: {
  name: string;
  boardCount: number;
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
          body={`This deletes its ${boardCount} moodboard${boardCount === 1 ? "" : "s"}, their images and comments, and the project bento. This can't be undone. Owners only.`}
          secondaryLabel="Cancel"
          onSecondary={onClose}
          primaryLabel={pending ? "Deleting…" : "Delete project"}
          primaryVariant="danger"
          primaryType="submit"
          primaryDisabled={!ok || pending}
          onClose={onClose}
        >
          <label className="flex flex-col gap-2">
            <span className="text-label-13 text-text-primary">Type the project name to confirm</span>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={name} autoFocus autoComplete="off" />
          </label>
          {error && <p className="text-caption-12 text-text-danger">{error}</p>}
        </Modal>
      </form>
    </Overlay>
  );
}
