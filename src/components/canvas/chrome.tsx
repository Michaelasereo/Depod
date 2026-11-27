import { cn } from "@/lib/cn";
import { Icon, type IconName } from "../icon/Icon";
import { Button, IconButton, LinkButton } from "../ui/Button";
import { Avatar, Badge } from "../ui/display";
import { Wordmark } from "../brand/Logo";

/* Floating panels on the canvas share one surface: raised bg, default border, float shadow. */
const floating = "border border-border-default bg-bg-surface-raised shadow-float";

/* Figma: Tool — State Default/Hover/Active, 40×40. */
export function Tool({
  icon,
  label,
  active,
  forceHover,
  onClick,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  forceHover?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      data-hover={forceHover || undefined}
      onClick={onClick}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-[10px] transition-colors",
        active ? "bg-action-primary text-action-on-primary" : "text-icon-primary hover:bg-bg-hover data-[hover]:bg-bg-hover",
      )}
    >
      <Icon name={icon} />
    </button>
  );
}

/* Figma: Toolbar (62:987) — Select, Hand, Images, Note, Comment. */
export type CanvasTool = "select" | "hand" | "images" | "note" | "comment";
const tools: Array<{ id: CanvasTool; icon: IconName; label: string }> = [
  { id: "select", icon: "cursor", label: "Select" },
  { id: "hand", icon: "hand", label: "Hand" },
  { id: "images", icon: "image", label: "Add images" },
  { id: "note", icon: "note", label: "Note" },
  { id: "comment", icon: "comment", label: "Comment" },
];
export function Toolbar({
  active = "select",
  onChange,
  only,
}: {
  active?: CanvasTool;
  onChange?: (tool: CanvasTool) => void;
  /** Limit the tools, e.g. the shared view shows Hand and Comment only. */
  only?: CanvasTool[];
}) {
  return (
    <div role="toolbar" aria-label="Canvas tools" className={cn("inline-flex gap-1 rounded-2xl p-2", floating)}>
      {tools
        .filter((t) => !only || only.includes(t.id))
        .map((t) => (
          <Tool key={t.id} icon={t.icon} label={t.label} active={active === t.id} onClick={() => onChange?.(t.id)} />
        ))}
    </div>
  );
}

/* Figma: Zoom (62:1012). */
export function Zoom({ percent, onIn, onOut }: { percent: number; onIn?: () => void; onOut?: () => void }) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-xl p-1.5", floating)}>
      <IconButton icon="minus" label="Zoom out" size="small" onClick={onOut} />
      <span className="min-w-[3ch] text-center text-label-13 text-text-primary">{percent}%</span>
      <IconButton icon="plus" label="Zoom in" size="small" onClick={onIn} />
    </div>
  );
}

/* Figma: Canvas nav / Left (62:942) — menu, wordmark, breadcrumb (Parent optional). */
export function CanvasNavLeft({ parent, current, onMenu }: { parent?: string; current: string; onMenu?: () => void }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("inline-flex items-center gap-2.5 rounded-[14px] p-2", floating)}>
      <IconButton icon="menu" label="Menu" onClick={onMenu} />
      <Wordmark className="text-text-primary" />
      <span className="h-5 w-px bg-border-default" />
      <span className="flex items-center gap-1.5 px-1 text-label-13">
        {parent && (
          <>
            <span className="text-text-secondary">{parent}</span>
            <span className="text-text-tertiary">/</span>
          </>
        )}
        <span className="text-text-primary">{current}</span>
      </span>
    </nav>
  );
}

/* Figma: Canvas nav / Right (62:964) — collaborators, secondary and primary actions. */
export function CanvasNavRight({
  people,
  secondaryLabel = "Share",
  primaryLabel = "Export",
  primaryIcon = "download",
  onSecondary,
  onPrimary,
}: {
  primaryIcon?: IconName;
  people: Array<{ initials: string; name: string }>;
  secondaryLabel?: string;
  /** null hides the primary action. */
  primaryLabel?: string | null;
  onSecondary?: () => void;
  onPrimary?: () => void;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-[14px] p-2", floating)}>
      <span className="flex -space-x-1 px-1">
        {people.slice(0, 3).map((p) => (
          <Avatar key={p.name} initials={p.initials} name={p.name} size={24} />
        ))}
      </span>
      <Button variant="secondary" onClick={onSecondary}>
        {secondaryLabel}
      </Button>
      {primaryLabel && (
        <Button leadingIcon={primaryIcon} onClick={onPrimary}>
          {primaryLabel}
        </Button>
      )}
    </div>
  );
}

/* Figma: Bento tile (59:1025) — State Default/Hover/Selected/Locked/Uploading/Failed/Missing; Comments. */
export type TileState = "default" | "hover" | "selected" | "locked" | "uploading" | "failed" | "missing";
export function BentoTile({
  src,
  color,
  state = "default",
  progress = 0.5,
  comments,
  className,
  onRetry,
}: {
  src?: string;
  /** Placeholder colour when there is no image yet. */
  color?: string;
  state?: TileState;
  progress?: number;
  comments?: number;
  className?: string;
  onRetry?: () => void;
}) {
  const failed = state === "failed" || state === "missing";
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl",
        failed ? "border border-dashed border-border-strong bg-bg-surface" : "bg-bg-subtle",
        state === "selected" && "outline-2 outline-border-focus",
        className,
      )}
    >
      {!failed && (
        <div
          className={cn("absolute inset-0 bg-cover bg-center", state === "uploading" && "opacity-50")}
          style={{ backgroundImage: src ? `url(${src})` : undefined, backgroundColor: src ? undefined : color }}
        />
      )}
      {failed && (
        <button type="button" onClick={onRetry} className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-caption-12 text-text-secondary">
          <Icon name={state === "missing" ? "image" : "retry"} />
          {state === "missing" ? "Image missing · Replace" : "Upload failed · Retry"}
        </button>
      )}
      {state === "uploading" && (
        <div className="absolute inset-x-4 bottom-4 h-1 rounded-full bg-bg-surface">
          <div className="h-full rounded-full bg-action-primary" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      {state === "locked" && (
        <span className="absolute left-2 top-2">
          <Badge type="inverse" icon="lock">
            Locked
          </Badge>
        </span>
      )}
      {!failed && state !== "uploading" && (
      <div
        className={cn(
          "absolute right-2 top-2 rounded-[10px] p-0.5",
          floating,
          state === "hover" ? "flex" : "hidden group-hover:flex",
        )}
      >
        <IconButton icon="lock" label="Lock tile" size="small" />
        <IconButton icon="comment" label="Comment" size="small" />
        <IconButton icon="more" label="More" size="small" />
      </div>
      )}
      {comments ? (
        <span className="absolute bottom-2 right-2 inline-flex size-[26px] items-center justify-center rounded-[13px] rounded-bl-[3px] bg-bg-inverse text-[12px] font-medium text-text-inverse">
          {comments}
        </span>
      ) : null}
    </div>
  );
}

/* 08 / 08b: the right of the shared view. Signed in: View only and your avatar. Signed out: Sign in. */
export function SharedNavRight({ signedIn, initials, signInHref }: { signedIn: boolean; initials?: string; signInHref: string }) {
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-[14px] p-2", floating)}>
      {signedIn ? (
        <>
          <Badge icon="eye">View only</Badge>
          <Avatar initials={initials ?? ""} name="You" size={24} />
        </>
      ) : (
        <LinkButton href={signInHref}>Sign in</LinkButton>
      )}
    </div>
  );
}
