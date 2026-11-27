import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { Illustration } from "@/components/illustration/Illustration";
import { LinkButton } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Link not working · Depod" };

/* Figma 25 Link not working (Empty state with the link-broken drawing). */
export default function LinkNotWorking() {
  return (
    <AuthShell>
      <main className="flex w-[360px] max-w-full flex-col items-center gap-2 text-center">
        <Illustration name="link-broken" />
        <div className="h-2" />
        <h1 className="text-heading-20 text-text-primary">This link isn&apos;t working</h1>
        <p className="text-body-15 text-text-secondary">It may have expired or already been used. Links work once.</p>
        <div className="h-2" />
        <LinkButton href="/sign-in">Send a new link</LinkButton>
      </main>
    </AuthShell>
  );
}
