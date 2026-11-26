import type { ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "../icon/Icon";

/*
 * Figma: Button (58:905) and Icon button (58:997).
 * Variants map 1:1 — Type, Size, State. Hover is real :hover; `forceHover` only exists
 * so the components page can show the Hover variant next to Figma.
 */
export type ButtonType = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "medium" | "small";

const tone: Record<ButtonType, string> = {
  primary: "bg-action-primary text-action-on-primary hover:bg-action-primary-hover data-[hover]:bg-action-primary-hover",
  secondary: "bg-action-secondary text-action-on-secondary hover:bg-action-secondary-hover data-[hover]:bg-action-secondary-hover",
  ghost: "bg-transparent text-text-primary hover:bg-bg-hover data-[hover]:bg-bg-hover",
  danger: "bg-action-danger text-action-on-danger",
};

const disabledReset: Record<ButtonType, string> = {
  primary: "disabled:hover:bg-action-primary",
  secondary: "disabled:hover:bg-action-secondary",
  ghost: "disabled:hover:bg-transparent",
  danger: "",
};

type BaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  variant?: ButtonType;
  size?: ButtonSize;
  forceHover?: boolean;
  htmlType?: "button" | "submit" | "reset";
};

export type ButtonProps = BaseProps & {
  leadingIcon?: IconName;
  trailingIcon?: IconName;
  fullWidth?: boolean;
};

export function Button({
  variant = "primary",
  size = "medium",
  leadingIcon,
  trailingIcon,
  fullWidth,
  forceHover,
  htmlType = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  const iconSize = size === "medium" ? 20 : 16;
  return (
    <button
      type={htmlType}
      data-hover={forceHover || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap text-label-13 transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        size === "medium" ? "h-9 rounded-[10px] px-4" : "h-7 rounded-lg px-3",
        tone[variant],
        disabledReset[variant],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {leadingIcon && <Icon name={leadingIcon} size={iconSize} />}
      {children}
      {trailingIcon && <Icon name={trailingIcon} size={iconSize} />}
    </button>
  );
}

/** The Button look on a link, for navigation (never a <button> inside an <a>). */
export function LinkButton({
  href,
  variant = "primary",
  size = "medium",
  leadingIcon,
  trailingIcon,
  fullWidth,
  className,
  children,
}: {
  href: string;
  variant?: ButtonType;
  size?: ButtonSize;
  leadingIcon?: IconName;
  trailingIcon?: IconName;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const iconSize = size === "medium" ? 20 : 16;
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap text-label-13 transition-colors",
        size === "medium" ? "h-9 rounded-[10px] px-4" : "h-7 rounded-lg px-3",
        tone[variant],
        fullWidth && "w-full",
        className,
      )}
    >
      {leadingIcon && <Icon name={leadingIcon} size={iconSize} />}
      {children}
      {trailingIcon && <Icon name={trailingIcon} size={iconSize} />}
    </Link>
  );
}

export type IconButtonProps = BaseProps & {
  icon: IconName;
  /** Accessible name; icon buttons have no visible text. */
  label: string;
  variant?: Exclude<ButtonType, "danger">;
};

export function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "medium",
  forceHover,
  htmlType = "button",
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={htmlType}
      aria-label={label}
      title={label}
      data-hover={forceHover || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        size === "medium" ? "size-9 rounded-[10px]" : "size-7 rounded-lg",
        tone[variant],
        disabledReset[variant],
        variant === "ghost" && "text-icon-primary",
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={size === "medium" ? 20 : 16} />
    </button>
  );
}
