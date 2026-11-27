import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthCard, AuthShell } from "@/components/auth/AuthShell";
import { supabaseServer } from "@/lib/supabase/server";
import { maskEmail } from "@/lib/security/flow";
import { VerifyEmailForm } from "./VerifyEmailForm";

export const metadata: Metadata = { title: "Check your email for a code · Depod" };

export default function VerifyPage({ searchParams }: PageProps<"/verify">) {
  return (
    <AuthShell>
      <Suspense>
        <Content searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/verify">["searchParams"] }) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) redirect("/sign-in");
  const sp = await searchParams;
  return (
    <AuthCard title="Check your email for a code" body={`We sent a 6-digit code to ${maskEmail(data.user.email)}. It expires in 10 minutes.`}>
      <VerifyEmailForm next={typeof sp.next === "string" ? sp.next : undefined} />
    </AuthCard>
  );
}
