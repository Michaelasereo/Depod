import { cn } from "@/lib/cn";
import { Icon, type IconName } from "../icon/Icon";

/* Figma: Badge — Type Neutral/Inverse/Success/Danger, optional icon. */
export type BadgeType = "neutral" | "inverse" | "success" | "danger";
const badgeTone: Record<BadgeType, string> = {
  neutral: "bg-bg-subtle text-text-secondary",
  inverse: "bg-bg-inverse text-text-inverse",
  success: "bg-status-success-bg text-text-success",
  danger: "bg-status-danger-bg text-text-danger",
};
export function Badge({ type = "neutral", icon, children }: { type?: BadgeType; icon?: IconName; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-[12px] font-medium leading-4", badgeTone[type])}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}

/* Figma: Avatar — Size 20/24/32/40, initials on bg/subtle with a surface ring. */
const avatarSize = {
  20: "size-5 text-[8px] ring-[1.5px]",
  24: "size-6 text-[10px] ring-[1.5px]",
  32: "size-8 text-label-13 ring-2",
  40: "size-10 text-label-13 ring-2",
} as const;
export function Avatar({ initials, size = 32, src, name }: { initials: string; size?: 20 | 24 | 32 | 40; src?: string; name?: string }) {
  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-subtle font-medium text-text-secondary ring-bg-surface",
        avatarSize[size],
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? ""} className="size-full object-cover" />
      ) : (
        <span aria-label={name}>{initials}</span>
      )}
    </span>
  );
}

/* Figma: Tooltip. */
export function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span role="tooltip" className="inline-flex rounded-lg bg-bg-inverse px-2.5 py-1.5 text-caption-12 text-text-inverse">
      {children}
    </span>
  );
}

/* Figma: Toast — Action Yes/No. */
export function Toast({ message, actionLabel, onAction }: { message: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div role="status" className="inline-flex h-11 items-center gap-4 rounded-xl bg-bg-inverse px-4 text-label-13 text-text-inverse shadow-float">
      <span>{message}</span>
      {actionLabel && (
        <button type="button" onClick={onAction} className="text-[13px] opacity-70 hover:opacity-100">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* Figma: Banner — Type Neutral/Inverse/Danger, full width, optional action. */
const bannerTone = {
  neutral: "bg-bg-subtle text-text-primary",
  inverse: "bg-bg-inverse text-text-inverse",
  danger: "bg-status-danger-bg text-text-danger",
} as const;
export function Banner({
  type = "neutral",
  message,
  actionLabel,
  onAction,
}: {
  type?: keyof typeof bannerTone;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div role={type === "danger" ? "alert" : "status"} className={cn("flex w-full items-center justify-between gap-3 px-6 py-3", bannerTone[type])}>
      <span className="text-label-13">{message}</span>
      {actionLabel && (
        <button type="button" onClick={onAction} className="text-[13px] underline-offset-2 hover:underline">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* Figma: Reaction — Mine On/Off. */
export function Reaction({ emoji, count, mine, onClick }: { emoji: string; count: number; mine?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={mine}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full border px-2 text-label-13 text-text-primary",
        mine ? "border-border-focus bg-bg-subtle" : "border-border-default bg-bg-surface hover:bg-bg-hover",
      )}
    >
      <span className="text-[14px] leading-none">{emoji}</span>
      {count}
    </button>
  );
}

/* Figma: Comment pin — State Default/Selected/Resolved. Rounded except bottom-left. */
export function CommentPin({ count, state = "default" }: { count: number; state?: "default" | "selected" | "resolved" }) {
  return (
    <span
      className={cn(
        "inline-flex size-[26px] items-center justify-center rounded-[13px] rounded-bl-[3px] text-[12px] font-medium",
        state === "resolved" ? "bg-bg-subtle text-text-secondary" : "bg-bg-inverse text-text-inverse",
        state === "selected" && "shadow-float ring-2 ring-bg-surface",
      )}
    >
      {count}
    </span>
  );
}
