import { iconPaths, type IconName } from "./paths";

export type { IconName };

type IconProps = {
  name: IconName;
  /** 20 (default), 16 or 14 — the sizes used in the Figma components. */
  size?: 14 | 16 | 20;
  className?: string;
  /** Give a label only when the icon carries meaning on its own. */
  label?: string;
};

/** Figma: Icon/* — one outlined shape on a 20×20 grid, coloured by `currentColor`. */
export function Icon({ name, size = 20, className, label }: IconProps) {
  const p = iconPaths[name];
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path transform={`translate(${p.x} ${p.y})`} d={p.d} />
    </svg>
  );
}
