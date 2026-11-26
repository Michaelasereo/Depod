"use client";

import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "../icon/Icon";

/* Figma: Toggle — Value On/Off, State Default/Disabled. 40×24 track, 20px knob. */
export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "bg-action-primary" : "bg-border-strong",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-5 rounded-full transition-transform",
          checked ? "translate-x-[18px] bg-action-on-primary" : "translate-x-0.5 bg-bg-surface",
        )}
      />
    </button>
  );
}

/* Figma: Checkbox — 18×18, radius 5. */
export function Checkbox({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "bg-action-primary text-action-on-primary" : "border-[1.5px] border-border-strong bg-bg-surface",
      )}
    >
      {checked && <Icon name="check" size={16} />}
    </button>
  );
}

/* Figma: Radio — Selected On is a 5px focus-colour ring. */
export function Radio({
  selected,
  onSelect,
  label,
}: {
  selected: boolean;
  onSelect?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onSelect}
      className={cn(
        "inline-block size-[18px] shrink-0 rounded-full bg-bg-surface",
        selected ? "border-[5px] border-border-focus" : "border-[1.5px] border-border-strong",
      )}
    />
  );
}

/* Figma: Input — State Default/Focus/Error/Disabled, optional leading icon. */
export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  leadingIcon?: IconName;
  error?: boolean;
  /** Shows the Focus variant without focusing, for the components page. */
  forceFocus?: boolean;
};

export function Input({ leadingIcon, error, forceFocus, disabled, className, ...rest }: InputProps) {
  return (
    <label
      data-focus={forceFocus || undefined}
      className={cn(
        "flex h-10 w-full items-center gap-2 rounded-[10px] border px-3 text-body-15",
        disabled ? "border-border-strong bg-bg-subtle" : "bg-bg-surface",
        error
          ? "border-text-danger"
          : "border-border-strong focus-within:border-2 focus-within:border-border-focus focus-within:px-[11px] data-[focus]:border-2 data-[focus]:border-border-focus data-[focus]:px-[11px]",
        className,
      )}
    >
      {leadingIcon && <Icon name={leadingIcon} className="text-icon-secondary" />}
      <input
        disabled={disabled}
        aria-invalid={error || undefined}
        className="min-w-0 flex-1 bg-transparent text-text-primary outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed"
        {...rest}
      />
    </label>
  );
}

/* Figma: Chip — Selected On/Off. */
export function Chip({
  selected,
  onClick,
  children,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-label-13 transition-colors",
        selected ? "bg-action-primary text-action-on-primary" : "bg-action-secondary text-action-on-secondary hover:bg-action-secondary-hover",
      )}
    >
      {children}
    </button>
  );
}
