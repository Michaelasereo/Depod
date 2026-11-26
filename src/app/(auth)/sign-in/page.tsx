import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard, AuthShell } from "@/components/auth/AuthShell";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign in · Depod" };

/* Figma 01 Sign in. */
export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <AuthShell>
      <AuthCard title="Sign in to Depod" body="Use Google, or get a sign-in link by email. New here? The same link creates your account.">
        <Suspense>
          <Form searchParams={searchParams} />
        </Suspense>
      </AuthCard>
    </AuthShell>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/sign-in">["searchParams"] }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return <SignInForm next={next} googleError={sp.error === "google"} />;
}
