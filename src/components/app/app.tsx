import Link from "next/link";
import { cn } from "@/lib/cn";
import { Button, IconButton } from "../ui/Button";
import { Avatar } from "../ui/display";
import { Wordmark } from "../brand/Logo";

/* Figma: Nav link — Selected On/Off. */
export function NavLink({ href, selected, children }: { href: string; selected?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={cn(
        "inline-flex h-8 items-center rounded-lg px-3 text-label-13 transition-colors",
        selected ? "bg-bg-subtle text-text-primary" : "text-text-secondary hover:text-text-primary",
      )}
    >
      {children}
    </Link>
  );
}

/* Figma: Top nav (62:904) — wordmark, links, notifications, workspace switcher, avatar. */
export function TopNav({
  current,
  workspace,
  initials,
}: {
  current?: "home" | "projects" | "shared";
  workspace: string;
  initials: string;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border-default bg-bg-surface px-8">
      <div className="flex items-center gap-7">
        <Link href="/home" aria-label="Depod home">
          <Wordmark className="text-text-primary" />
        </Link>
        <nav className="flex gap-1">
          <NavLink href="/home" selected={current === "home"}>Home</NavLink>
          <NavLink href="/projects" selected={current === "projects"}>Projects</NavLink>
          <NavLink href="/shared" selected={current === "shared"}>Shared with me</NavLink>
        </nav>
      </div>
      <div className="flex items-center gap-2.5">
        <IconButton icon="bell" label="Notifications" />
        <Button variant="secondary" trailingIcon="chevron-down">{workspace}</Button>
        <Avatar initials={initials} size={32} />
      </div>
    </header>
  );
}

/* Figma: Settings nav item — Selected On/Off. */
export function SettingsNavItem({ href, selected, children }: { href: string; selected?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={cn(
        "flex h-9 w-[200px] items-center rounded-lg px-3 text-label-13",
        selected ? "bg-bg-subtle text-text-primary" : "text-text-secondary hover:bg-bg-hover",
      )}
    >
      {children}
    </Link>
  );
}

/* Figma: Moodboard card (62:1052) — bento thumbnail, Name, Details, more menu. */
// Tile rectangles from Figma (x, y, w, h inside the 320×208 thumbnail).
const thumbTiles: Array<[number, number, number, number]> = [
  [8, 8, 140, 124], [154, 8, 76, 58], [154, 72, 76, 60], [236, 8, 76, 124],
  [8, 138, 92, 62], [106, 138, 124, 62], [236, 138, 76, 62],
];
const pct = (v: number, of: number) => `${(v / of) * 100}%`;
export function MoodboardCard({
  href,
  name,
  details,
  images,
  onMore,
}: {
  href: string;
  name: string;
  details: string;
  /** Up to 7 image URLs or colours for the thumbnail bento. */
  images: string[];
  onMore?: (anchor: DOMRect) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-2.5">
      <Link href={href} className="relative aspect-[320/208] rounded-2xl bg-bg-subtle">
        {images.slice(0, 7).map((img, i) => {
          const [x, y, w, h] = thumbTiles[i];
          return (
            <span
              key={i}
              className="absolute rounded-[10px] bg-cover bg-center"
              style={{
                left: pct(x, 320), top: pct(y, 208), width: pct(w, 320), height: pct(h, 208),
                ...(img.startsWith("#") ? { backgroundColor: img } : { backgroundImage: `url(${img})` }),
              }}
            />
          );
        })}
      </Link>
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link href={href} className="truncate text-label-13 text-text-primary">{name}</Link>
          <span className="truncate text-caption-12 text-text-secondary">{details}</span>
        </div>
        <IconButton icon="more" label={`More for ${name}`} size="small" onClick={(e) => onMore?.(e.currentTarget.getBoundingClientRect())} />
      </div>
    </div>
  );
}

/* Figma: Project card (62:1071). */
export function ProjectCard({
  href,
  name,
  details,
  images,
  editing,
  onRename,
  onMore,
}: {
  href: string;
  name: string;
  details: string;
  images: string[];
  /** 37b: the name turns into a field. Enter saves, Escape cancels. */
  editing?: boolean;
  onRename?: (name: string | null) => void;
  onMore?: (anchor: DOMRect) => void;
}) {
  const thumbs = [...images.slice(0, 3), ...Array(Math.max(0, 3 - images.length)).fill("")];
  return (
    <div className="flex w-full flex-col gap-3 rounded-[20px] border border-border-default bg-bg-surface p-3">
      <Link href={href} className="grid h-[140px] grid-cols-[2fr_1fr_1fr] gap-2">
        {thumbs.map((img, i) => (
          <span
            key={i}
            className="rounded-xl bg-bg-subtle bg-cover bg-center"
            style={!img ? undefined : img.startsWith("#") ? { backgroundColor: img } : { backgroundImage: `url("${img}")` }}
          />
        ))}
      </Link>
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {editing ? (
            <input
              autoFocus
              defaultValue={name}
              aria-label="Project name"
              maxLength={120}
              className="h-8 w-full rounded-lg border-[1.5px] border-border-focus bg-bg-surface px-2 text-body-15 text-text-primary outline-none"
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRename?.(e.currentTarget.value);
                if (e.key === "Escape") onRename?.(null);
              }}
              onBlur={(e) => onRename?.(e.currentTarget.value)}
            />
          ) : (
            <Link href={href} className="truncate text-label-13 text-text-primary">
              {name}
            </Link>
          )}
          <span className="truncate text-caption-12 text-text-secondary">{details}</span>
        </div>
        <IconButton icon="more" label={`More for ${name}`} size="small" onClick={(e) => onMore?.(e.currentTarget.getBoundingClientRect())} />
      </div>
    </div>
  );
}
