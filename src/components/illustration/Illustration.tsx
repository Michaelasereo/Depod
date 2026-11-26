import { illustrations, type IllustrationName } from "./data";

export type { IllustrationName };

/** Figma: Illustration/* — line-drawn isometric drawings bound to the illustration tokens. */
export function Illustration({ name, className }: { name: IllustrationName; className?: string }) {
  const { viewBox, svg } = illustrations[name];
  const [, , w, h] = viewBox.split(" ").map(Number);
  return (
    <svg
      viewBox={viewBox}
      width={w}
      height={h}
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
      // Trusted, generated from design/illustrations at build time.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
