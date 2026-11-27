import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard, AuthShell } from "@/components/auth/AuthShell";
import { AuthenticatorForm } from "./AuthenticatorForm";

export const metadata: Metadata = { title: "Enter your authenticator code · Depod" };

export default function AuthenticatorPage({ searchParams }: PageProps<"/verify/authenticator">) {
  return (
    <AuthShell>
      <AuthCard title="Enter your authenticator code" body="Open your authenticator app and enter the 6-digit code for Depod.">
        <Suspense>
          <Form searchParams={searchParams} />
        </Suspense>
      </AuthCard>
    </AuthShell>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/verify/authenticator">["searchParams"] }) {
  const sp = await searchParams;
  return <AuthenticatorForm next={typeof sp.next === "string" ? sp.next : undefined} />;
}
