"use client";

import { useState } from "react";
import { iconNames } from "@/components/icon/paths";
import { Icon } from "@/components/icon/Icon";
import { illustrations, type IllustrationName } from "@/components/illustration/data";
import { Illustration } from "@/components/illustration/Illustration";
import { Wordmark, Mark } from "@/components/brand/Logo";
import { Button, IconButton } from "@/components/ui/Button";
import { Checkbox, Chip, Input, Radio, Toggle } from "@/components/ui/controls";
import { Avatar, Badge, Banner, CommentPin, Reaction, Toast, Tooltip } from "@/components/ui/display";
import { EmptyState, Menu, MenuDivider, MenuItem, Modal } from "@/components/ui/overlays";
import { BentoTile, CanvasNavLeft, CanvasNavRight, Tool, Toolbar, Zoom, type TileState } from "@/components/canvas/chrome";
import { MoodboardCard, NavLink, ProjectCard, SettingsNavItem, TopNav } from "@/components/app/app";
import { FaqItem, FeatureItem, PlanCard, SiteFooter, SiteNav } from "@/components/site/site";

const PAL = ["#C9A27E", "#2F4A3A", "#E8D5C4", "#8C3B2E", "#D8B44A", "#3E5C76", "#B8C4A8", "#E07A5F", "#6E5A7E", "#B5677A", "#F2EAD3", "#344966"];

function Section({ title, figma, children }: { title: string; figma?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border-default pt-6">
      <div className="flex items-baseline gap-3">
        <h2 className="text-heading-20">{title}</h2>
        {figma && <span className="text-caption-12 text-text-tertiary">Figma: {figma}</span>}
      </div>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="w-full text-caption-12 text-text-tertiary">{children}</span>;
}

function Library() {
  const [toggle, setToggle] = useState(true);
  const [check, setCheck] = useState(true);
  const [radio, setRadio] = useState(0);
  const [chip, setChip] = useState(0);
  const [tool, setTool] = useState<"select" | "hand" | "images" | "note" | "comment">("select");
  const types = ["primary", "secondary", "ghost", "danger"] as const;
  const tiles: TileState[] = ["default", "hover", "selected", "locked", "uploading", "failed", "missing"];

  return (
    <div className="flex flex-col gap-10">
      <Section title="Colour" figma="Depod / Semantic">
        {["bg-canvas", "bg-surface", "bg-surface-raised", "bg-subtle", "bg-hover", "bg-inverse", "text-primary", "text-secondary", "text-tertiary", "text-danger", "text-success", "border-default", "border-strong", "action-primary", "action-secondary", "action-danger", "status-danger-bg", "status-success-bg"].map((t) => (
          <div key={t} className="flex w-[120px] flex-col gap-1.5">
            <span className="h-10 rounded-lg border border-border-default" style={{ background: `var(--${t})` }} />
            <span className="text-caption-12 text-text-secondary">{t}</span>
          </div>
        ))}
      </Section>

      <Section title="Type" figma="Text styles">
        <div className="flex w-full flex-col gap-2">
          <span className="text-display-64">Display 64</span>
          <span className="text-display-48">Display 48</span>
          <span className="text-display-40">Display 40</span>
          <span className="text-heading-20">Heading 20</span>
          <span className="text-title-17">Title 17</span>
          <span className="text-body-15">Body 15 — Drop images to start your first moodboard.</span>
          <span className="text-label-13">Label 13</span>
          <span className="text-caption-12 text-text-secondary">Caption 12</span>
        </div>
      </Section>

      <Section title="Logo" figma="Logo/Wordmark, Logo/Mark">
        <Wordmark className="text-text-primary" />
        <Mark className="text-text-primary" />
      </Section>

      <Section title={`Icons (${iconNames.length})`} figma="Icon/*">
        {iconNames.map((n) => (
          <div key={n} className="flex w-[72px] flex-col items-center gap-1 text-icon-primary">
            <Icon name={n} />
            <span className="text-[10px] text-text-tertiary">{n}</span>
          </div>
        ))}
      </Section>

      <Section title="Button" figma="Button · Type × Size × State">
        {types.map((t) => (
          <div key={t} className="flex w-full flex-wrap items-center gap-3">
            <Label>{t}</Label>
            <Button variant={t}>Button</Button>
            <Button variant={t} forceHover>Hover</Button>
            <Button variant={t} disabled>Disabled</Button>
            <Button variant={t} leadingIcon="plus" trailingIcon="arrow-right">With icons</Button>
            <Button variant={t} size="small">Small</Button>
            <Button variant={t} size="small" leadingIcon="plus">Small icon</Button>
          </div>
        ))}
      </Section>

      <Section title="Icon button" figma="Icon button · Type × Size × State">
        {(["primary", "secondary", "ghost"] as const).map((t) => (
          <div key={t} className="flex items-center gap-2">
            <IconButton variant={t} icon="more" label="More" />
            <IconButton variant={t} icon="more" label="More" forceHover />
            <IconButton variant={t} icon="more" label="More" disabled />
            <IconButton variant={t} icon="more" label="More" size="small" />
          </div>
        ))}
      </Section>

      <Section title="Controls" figma="Toggle, Checkbox, Radio, Chip">
        <Toggle checked={toggle} onChange={setToggle} label="Toggle" />
        <Toggle checked={false} label="Off" />
        <Toggle checked disabled label="Disabled" />
        <Checkbox checked={check} onChange={setCheck} label="Checkbox" />
        <Checkbox checked={false} label="Off" />
        <Checkbox checked disabled label="Disabled" />
        {[0, 1].map((i) => (
          <Radio key={i} selected={radio === i} onSelect={() => setRadio(i)} label={`Option ${i + 1}`} />
        ))}
        {["All", "Mine", "Shared"].map((c, i) => (
          <Chip key={c} selected={chip === i} onClick={() => setChip(i)}>{c}</Chip>
        ))}
      </Section>

      <Section title="Input" figma="Input · Default, Focus, Error, Disabled">
        <div className="flex w-[320px] flex-col gap-3">
          <Input leadingIcon="search" placeholder="Placeholder" />
          <Input leadingIcon="search" placeholder="Focus" forceFocus />
          <Input placeholder="Error" error />
          <Input placeholder="Disabled" disabled />
          <Input defaultValue="you@company.com" />
        </div>
      </Section>

      <Section title="Badge and avatar" figma="Badge, Avatar">
        <Badge>Neutral</Badge>
        <Badge type="inverse" icon="lock">Locked</Badge>
        <Badge type="success">Paid</Badge>
        <Badge type="danger">Failed</Badge>
        <Avatar initials="MA" size={20} />
        <Avatar initials="MA" size={24} />
        <Avatar initials="MA" size={32} />
        <Avatar initials="MA" size={40} />
      </Section>

      <Section title="Feedback" figma="Toast, Tooltip, Banner">
        <Toast message="Link copied" />
        <Toast message="Moodboard deleted" actionLabel="Undo" />
        <Tooltip>Tooltip</Tooltip>
        <div className="flex w-full flex-col gap-2">
          <Banner message="Your trial ends in 3 days." actionLabel="Choose a plan" />
          <Banner type="inverse" message="You're viewing a shared moodboard." actionLabel="Sign in" />
          <Banner type="danger" message="Payment failed. Update your card to keep Team features." actionLabel="Update card" />
        </div>
      </Section>

      <Section title="Menu and modal" figma="Menu, Menu item, Modal">
        <Menu>
          <MenuItem icon="link">Copy link</MenuItem>
          <MenuItem icon="copy" forceHover>Duplicate</MenuItem>
          <MenuItem icon="eye" checked>Show comments</MenuItem>
          <MenuDivider />
          <MenuItem icon="trash" danger>Delete</MenuItem>
        </Menu>
        <Modal
          title="Delete moodboard?"
          body="This deletes the moodboard, its bento and its comments. You can't undo this."
          secondaryLabel="Cancel"
          primaryLabel="Delete"
          primaryVariant="danger"
        />
      </Section>

      <Section title="Reactions and comments" figma="Reaction, Comment pin">
        <Reaction emoji="🔥" count={3} mine />
        <Reaction emoji="👍" count={1} />
        <CommentPin count={2} />
        <CommentPin count={2} state="selected" />
        <CommentPin count={2} state="resolved" />
      </Section>

      <Section title="Canvas" figma="Tool, Toolbar, Zoom, Canvas nav">
        <Tool icon="cursor" label="Select" />
        <Tool icon="cursor" label="Select" forceHover />
        <Tool icon="cursor" label="Select" active />
        <Toolbar active={tool} onChange={setTool} />
        <Zoom percent={72} />
        <CanvasNavLeft parent="Brand refresh" current="Moodboard name" />
        <CanvasNavRight people={[{ initials: "MA", name: "Michael" }, { initials: "TO", name: "Tolu" }, { initials: "AD", name: "Ada" }]} />
      </Section>

      <Section title="Bento tile" figma="Bento tile · State">
        {tiles.map((s, i) => (
          <div key={s} className="flex flex-col gap-1">
            <BentoTile state={s} color={PAL[i]} comments={s === "default" ? 2 : undefined} className="h-40 w-[200px]" />
            <span className="text-caption-12 text-text-tertiary">{s}</span>
          </div>
        ))}
      </Section>

      <Section title="App navigation" figma="Top nav, Nav link, Settings nav item">
        <div className="w-full overflow-hidden rounded-xl border border-border-default">
          <TopNav current="home" workspace="Michael's team" initials="MA" />
        </div>
        <NavLink href="#" selected>Home</NavLink>
        <NavLink href="#">Projects</NavLink>
        <div className="flex flex-col gap-1">
          <SettingsNavItem href="#" selected>Account</SettingsNavItem>
          <SettingsNavItem href="#">Preferences</SettingsNavItem>
          <SettingsNavItem href="#">Security</SettingsNavItem>
        </div>
      </Section>

      <Section title="Cards" figma="Moodboard card, Project card">
        <div className="w-[320px]">
          <MoodboardCard href="#" name="Brand refresh" details="Edited 2h ago · 24 images" images={PAL.slice(0, 7)} />
        </div>
        <div className="w-[420px]">
          <ProjectCard href="#" name="Brand refresh" details="4 moodboards · edited today" images={[PAL[0], PAL[2], PAL[4]]} />
        </div>
      </Section>

      <Section title={`Illustrations and empty state (${Object.keys(illustrations).length})`} figma="Illustration/*, Empty state">
        <EmptyState illustration="home-first" title="No moodboards yet" body="Drop images to start your first moodboard." actionLabel="New moodboard" actionIcon="plus" />
        {(Object.keys(illustrations) as IllustrationName[]).map((n) => (
          <div key={n} className="flex flex-col items-center gap-1">
            <Illustration name={n} className="h-[100px] w-auto" />
            <span className="text-[10px] text-text-tertiary">{n}</span>
          </div>
        ))}
      </Section>
    </div>
  );
}

function SiteLibrary() {
  return (
    <div className="flex flex-col gap-10">
      <Section title="Site nav and footer" figma="Site nav, Site footer">
        <div className="w-full overflow-hidden rounded-xl border border-border-default">
          <SiteNav />
          <SiteFooter />
        </div>
      </Section>
      <Section title="Feature item and FAQ item" figma="Feature item, FAQ item">
        <div className="w-[400px]">
          <FeatureItem icon="grid" title="Auto-arranging bento" body="Pick a starter layout; it re-arranges as you add images." />
        </div>
        <div className="w-full max-w-[880px]">
          <FaqItem defaultOpen question="Do I need an account to try it?" answer="No. Drop images on the demo above. You only sign up when you want to save or export." />
          <FaqItem question="Can I cancel anytime?" answer="" />
        </div>
      </Section>
      <Section title="Plan card" figma="Plan card · Highlight">
        <PlanCard name="Pro" price="$8" unit="a month" features={["Unlimited moodboards", "500 images each", "No export mark", "Saved versions"]} actionLabel="Choose Pro" actionHref="#" />
        <PlanCard highlight name="Team" price="$12" unit="per member a month" features={["Everything in Pro", "Roles, comments, reactions", "Lock a direction", "2,000 images each"]} actionLabel="Start Team trial" actionHref="#" note="14-day trial, no card" />
      </Section>
    </div>
  );
}

export function Showcase() {
  const [view, setView] = useState<"app" | "site">("app");
  return (
    <main className="flex flex-col gap-6 p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-display-40">Components</h1>
          <p className="text-body-15 text-text-secondary">Every Figma component in code. App components show light and dark side by side; the marketing site is light only.</p>
        </div>
        <div className="flex gap-2">
          <Chip selected={view === "app"} onClick={() => setView("app")}>App</Chip>
          <Chip selected={view === "site"} onClick={() => setView("site")}>Marketing site</Chip>
        </div>
      </header>
      {view === "app" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <div data-theme="light" className="rounded-3xl bg-bg-canvas p-8 text-text-primary">
            <p className="mb-6 text-label-13 text-text-secondary">Light</p>
            <Library />
          </div>
          <div data-theme="dark" className="rounded-3xl bg-bg-canvas p-8 text-text-primary">
            <p className="mb-6 text-label-13 text-text-secondary">Dark</p>
            <Library />
          </div>
        </div>
      ) : (
        <div data-theme="light" className="rounded-3xl bg-bg-canvas p-8 text-text-primary">
          <SiteLibrary />
        </div>
      )}
    </main>
  );
}
