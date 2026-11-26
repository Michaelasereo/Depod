import { cn } from "@/lib/cn";
import { Icon, type IconName } from "../icon/Icon";
import { Button, IconButton } from "./Button";
import { Illustration, type IllustrationName } from "../illustration/Illustration";

/* Figma: Menu (59:850) and Menu item — Type Default/Danger, optional icon and check. */
export function Menu({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="menu" className={cn("flex w-[234px] flex-col gap-0.5 rounded-[14px] border border-border-default bg-bg-surface-raised p-1.5 shadow-float", className)}>
      {children}
    </div>
  );
}

export function MenuItem({
  icon,
  danger,
  checked,
  forceHover,
  onSelect,
  children,
}: {
  icon?: IconName;
  danger?: boolean;
  checked?: boolean;
  forceHover?: boolean;
  onSelect?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role={checked === undefined ? "menuitem" : "menuitemcheckbox"}
      aria-checked={checked}
      data-hover={forceHover || undefined}
      onClick={onSelect}
      className={cn(
        "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-label-13 hover:bg-bg-hover data-[hover]:bg-bg-hover",
        danger ? "text-text-danger" : "text-text-primary",
      )}
    >
      {icon && <Icon name={icon} />}
      <span className="flex-1">{children}</span>
      {checked && <Icon name="check" />}
    </button>
  );
}

export function MenuDivider() {
  return <hr className="mx-1.5 my-0.5 border-border-default" />;
}

/* Figma: Modal (62:1027) — Title, Body (optional), content slot, Secondary (optional) and Primary. */
export function Modal({
  title,
  body,
  children,
  primaryLabel,
  secondaryLabel,
  primaryVariant = "primary",
  onPrimary,
  onSecondary,
  onClose,
}: {
  title: string;
  body?: string;
  children?: React.ReactNode;
  primaryLabel: string;
  secondaryLabel?: string;
  primaryVariant?: "primary" | "danger";
  onPrimary?: () => void;
  onSecondary?: () => void;
  onClose?: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="flex w-[480px] max-w-full flex-col gap-5 rounded-[20px] bg-bg-surface-raised p-6 shadow-float">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-heading-20 text-text-primary">{title}</h2>
        <IconButton icon="close" label="Close" size="small" onClick={onClose} />
      </div>
      {body && <p className="text-body-15 text-text-secondary">{body}</p>}
      {children && <div className="flex flex-col gap-3">{children}</div>}
      <div className="flex justify-end gap-2">
        {secondaryLabel && (
          <Button variant="secondary" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
        <Button variant={primaryVariant} onClick={onPrimary}>
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
}

/* Figma: Empty state (59:1026) — Illustration, Title, Body, optional Action. */
export function EmptyState({
  illustration,
  title,
  body,
  actionLabel,
  actionIcon,
  onAction,
}: {
  illustration: IllustrationName;
  title: string;
  body: string;
  actionLabel?: string;
  actionIcon?: IconName;
  onAction?: () => void;
}) {
  return (
    <div className="flex w-[360px] max-w-full flex-col items-center gap-2 text-center">
      <Illustration name={illustration} />
      <div className="h-2" />
      <h2 className="text-heading-20 text-text-primary">{title}</h2>
      <p className="text-body-15 text-text-secondary">{body}</p>
      {actionLabel && (
        <>
          <div className="h-2" />
          <Button leadingIcon={actionIcon} onClick={onAction}>
            {actionLabel}
          </Button>
        </>
      )}
    </div>
  );
}
