"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "../icon/Icon";
import { LinkButton } from "../ui/Button";
import { Badge } from "../ui/display";
import { Wordmark } from "../brand/Logo";

/* Marketing site components, light only (Figma section "Marketing site" in Components). */

/* Figma: Site nav. */
export function SiteNav() {
  return (
    <header className="flex h-[72px] items-center justify-between bg-bg-surface px-12">
      <Link href="/" aria-label="Depod home">
        <Wordmark className="text-text-primary" />
      </Link>
      <nav className="flex items-center gap-1">
        <LinkButton href="/pricing" variant="ghost">Pricing</LinkButton>
        <LinkButton href="/sign-in" variant="ghost">Sign in</LinkButton>
        <LinkButton href="/try">Get started</LinkButton>
      </nav>
    </header>
  );
}

/* Figma: Site footer — image bento, wordmark and credit, link columns. */
// Tile rectangles from Figma (x, y, w, h inside a 1176×240 area).
const footerTiles: Array<[number, number, number, number]> = [
  [0, 0, 300, 240], [308, 0, 180, 116], [308, 124, 180, 116], [496, 0, 220, 240],
  [724, 0, 150, 116], [882, 0, 294, 116], [724, 124, 260, 116], [992, 124, 184, 116],
];
const footerColours = ["#2F4A3A", "#D8B44A", "#E07A5F", "#F2EAD3", "#2F4A3A", "#D8B44A", "#E07A5F", "#F2EAD3"];
const columns: Array<[string, Array<[string, string]>]> = [
  ["Product", [["Pricing", "/pricing"], ["Enterprise", "/enterprise"], ["Sign in", "/sign-in"]]],
  ["Legal", [["Privacy", "/privacy"], ["Terms", "/terms"], ["Takedown request", "/terms#takedown"]]],
  ["Help", [["Support", "/support"], ["Contact form", "/enterprise"]]],
];
export function SiteFooter({ images, credit = "Made in Lagos by Michael Asere · © 2026" }: { images?: string[]; credit?: string }) {
  return (
    <footer className="flex flex-col gap-14 border-t border-border-default bg-bg-canvas px-6 py-[72px] md:px-[120px]">
      <div className="rounded-3xl border border-border-default bg-bg-surface p-3">
        <div className="relative aspect-[1176/240] w-full">
          {footerTiles.map(([x, y, w, h], i) => (
            <span
              key={i}
              className="absolute rounded-[14px] bg-cover bg-center"
              style={{
                left: `${(x / 1176) * 100}%`,
                top: `${(y / 240) * 100}%`,
                width: `${(w / 1176) * 100}%`,
                height: `${(h / 240) * 100}%`,
                ...(images?.[i] ? { backgroundImage: `url(${images[i]})` } : { backgroundColor: footerColours[i] }),
              }}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap justify-between gap-10">
        <div className="flex flex-col gap-4">
          <Wordmark className="text-text-primary" />
          <span className="text-caption-12 text-text-tertiary">{credit}</span>
        </div>
        <div className="flex gap-16">
          {columns.map(([head, links]) => (
            <div key={head} className="flex flex-col gap-2.5">
              <span className="text-label-13 text-text-primary">{head}</span>
              {links.map(([label, href]) => (
                <Link key={label} href={href} className="text-body-15 text-text-secondary hover:text-text-primary">
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* Figma: Feature item — Icon, Title, Body. */
export function FeatureItem({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-bg-subtle text-icon-primary">
        <Icon name={icon} />
      </span>
      <h3 className="text-title-17 text-text-primary">{title}</h3>
      <p className="text-body-15 text-text-secondary">{body}</p>
    </div>
  );
}

/* Figma: FAQ item — Open Yes/No, Question, Answer. */
export function FaqItem({ question, answer, defaultOpen = false }: { question: string; answer: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="flex w-full flex-col gap-2.5 border-b border-border-default py-[22px]">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 text-left">
        <span className="text-title-17 text-text-primary">{question}</span>
        <Icon name={open ? "minus" : "plus"} className="text-icon-primary" />
      </button>
      {open && <p className="text-body-15 text-text-secondary">{answer}</p>}
    </div>
  );
}

/* Figma: Plan card — Highlight Yes/No; Name, Price, Unit, Features, Note, Action. */
export function PlanCard({
  name,
  price,
  unit,
  features,
  actionLabel,
  actionHref,
  note,
  highlight,
  badge = "Most teams",
}: {
  name: string;
  price: string;
  unit?: string;
  features: string[];
  actionLabel: string;
  actionHref: string;
  note?: string;
  highlight?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-[282px] flex-col gap-5 rounded-[20px] bg-bg-surface p-6",
        highlight ? "border-2 border-border-focus" : "border border-border-default",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-title-17 text-text-primary">{name}</span>
        {highlight && <Badge>{badge}</Badge>}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-display-40 text-text-primary">{price}</span>
        <span className="min-h-4 text-caption-12 text-text-tertiary">{unit}</span>
      </div>
      <ul className="flex flex-col text-body-15 leading-[1.8] text-text-secondary">
        {features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <LinkButton href={actionHref} variant={highlight ? "primary" : "secondary"} fullWidth>
        {actionLabel}
      </LinkButton>
      {note && <span className="text-caption-12 text-text-tertiary">{note}</span>}
    </div>
  );
}
