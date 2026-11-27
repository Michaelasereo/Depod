"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "../icon/Icon";
import { Button, IconButton } from "../ui/Button";
import { Modal } from "../ui/overlays";
import type { CanvasImage } from "./types";

export function Scrim({ children, onClose, top }: { children: React.ReactNode; onClose: () => void; top?: boolean }) {
  return (
    <div
      className={cn("fixed inset-0 z-50 flex justify-center gap-6 bg-bg-overlay p-6", top ? "items-start pt-[120px]" : "items-center")}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      {children}
    </div>
  );
}

const ago = (iso?: string) => {
  if (!iso) return "";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
};

/* Figma 29 Image detail. */
export function ImageDetail({
  img,
  inBento,
  canEdit,
  onClose,
  onReplace,
  onRemove,
  onDelete,
}: {
  img: CanvasImage;
  inBento: boolean;
  canEdit: boolean;
  onClose: () => void;
  onReplace: () => void;
  onRemove: () => void;
  onDelete: () => void;
}) {
  const rows: Array<[string, string]> = [
    ["Added by", [img.addedBy, ago(img.addedAt)].filter(Boolean).join(" · ") || "—"],
    ["Size", `${img.width} × ${img.height}`],
    ["In bento", inBento ? "Yes" : "No"],
  ];
  return (
    <Scrim onClose={onClose} top>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img.url} alt={img.name} className="max-h-[80vh] min-w-0 max-w-[min(760px,55vw)] rounded-2xl object-contain" />
      <div role="dialog" aria-label={img.name} className="flex w-[360px] shrink-0 flex-col gap-4 rounded-[20px] bg-bg-surface-raised p-5 shadow-float">
        <div className="flex items-center justify-between gap-3">
          <h2 className="truncate text-heading-20 text-text-primary">{img.name}</h2>
          <IconButton icon="close" label="Close" size="small" onClick={onClose} />
        </div>
        <dl className="flex flex-col gap-2.5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 text-body-15">
              <dt className="text-text-secondary">{k}</dt>
              <dd className="text-text-primary">{v}</dd>
            </div>
          ))}
        </dl>
        {canEdit && (
          <div className="flex flex-col gap-2">
            {inBento && (
              <>
                <Button variant="secondary" leadingIcon="image" fullWidth onClick={onReplace}>
                  Replace image
                </Button>
                <Button variant="secondary" leadingIcon="close" fullWidth onClick={onRemove}>
                  Remove from bento
                </Button>
              </>
            )}
            <Button variant="danger" leadingIcon="trash" fullWidth onClick={onDelete}>
              Delete from References
            </Button>
          </div>
        )}
      </div>
    </Scrim>
  );
}

/* Figma 20b Replace image: drop or browse a new file, or pick one from References. */
export function ReplaceImage({
  candidates,
  onPick,
  onFile,
  onClose,
}: {
  candidates: CanvasImage[];
  onPick: (id: string) => void;
  onFile: (file: File) => void;
  onClose: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <Scrim onClose={onClose}>
      <Modal title="Replace image" body="The tile keeps its place, lock and comments." secondaryLabel="Cancel" onSecondary={onClose} onClose={onClose}>
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => (e.preventDefault(), setOver(true))}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const f = e.dataTransfer.files[0];
            if (f) onFile(f);
          }}
          className={cn(
            "flex h-28 flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed text-label-13 text-text-secondary",
            over ? "border-border-focus bg-bg-subtle" : "border-border-strong",
          )}
        >
          <Icon name="upload" />
          Drop an image or browse
        </button>
        <input ref={input} type="file" accept="image/*,.heic,.heif" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        {candidates.length > 0 && (
          <>
            <p className="text-caption-12 text-text-secondary">Or pick one from References</p>
            <div className="grid max-h-[220px] grid-cols-5 gap-2 overflow-y-auto">
              {candidates.map((c) => (
                <button key={c.id} type="button" onClick={() => onPick(c.id)} className="aspect-square overflow-hidden rounded-lg bg-bg-subtle hover:outline-2 hover:outline-border-focus">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.url} alt={c.name} className="size-full object-cover" />
                </button>
              ))}
            </div>
          </>
        )}
      </Modal>
    </Scrim>
  );
}

/* Figma 40c Duplicate image. */
export function DuplicateDialog({ count, onAdd, onSkip }: { count: number; onAdd: () => void; onSkip: () => void }) {
  return (
    <Scrim onClose={onSkip}>
      <Modal
        title="Add again?"
        body={`${count === 1 ? "1 of these images is" : `${count} of these images are`} already in References.`}
        secondaryLabel="Skip"
        onSecondary={onSkip}
        primaryLabel="Add again"
        onPrimary={onAdd}
        onClose={onSkip}
      />
    </Scrim>
  );
}
