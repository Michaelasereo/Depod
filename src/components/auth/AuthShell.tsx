import Link from "next/link";
import { Wordmark } from "../brand/Logo";

/* Figma 01, 34, 62a, 62b: canvas background, wordmark top left, centred card. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg-canvas px-4 py-24">
      <Link href="/" aria-label="Depod home" className="absolute left-10 top-8 text-text-primary">
        <Wordmark />
      </Link>
      {children}
    </div>
  );
}

export function AuthCard({ title, body, children }: { title: string; body?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <main className="flex w-full max-w-[440px] flex-col gap-4 rounded-3xl border border-border-default bg-bg-surface p-10">
      <h1 className="text-heading-20 text-text-primary">{title}</h1>
      {body && <p className="text-body-15 text-text-secondary">{body}</p>}
      {children}
    </main>
  );
}
