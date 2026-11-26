import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Icon } from "@/components/icon/Icon";
import { CheckEmailActions } from "./CheckEmail";

export const metadata: Metadata = { title: "Check your email · Depod" };

/* Figma 34 Check your email. */
export default function CheckEmailPage({ searchParams }: PageProps<"/sign-in/check-email">) {
  return (
    <AuthShell>
      <main className="flex w-full max-w-[440px] flex-col gap-4 rounded-3xl border border-border-default bg-bg-surface p-10">
        <Icon name="mail" size={20} className="size-10 text-icon-primary" />
        <h1 className="text-heading-20 text-text-primary">Check your email</h1>
        <Suspense>
          <Body searchParams={searchParams} />
        </Suspense>
      </main>
    </AuthShell>
  );
}

async function Body({ searchParams }: { searchParams: PageProps<"/sign-in/check-email">["searchParams"] }) {
  const sp = await searchParams;
  const email = typeof sp.email === "string" ? sp.email : "";
  return (
    <>
      <p className="text-body-15 text-text-secondary">
        We sent a sign-in link to {email || "your email"}. Open it on this device to continue.
      </p>
      <CheckEmailActions email={email} />
    </>
  );
}
