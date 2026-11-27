import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { verifiedUser } from "@/lib/security/flow";
import { recoveryCodesLeft } from "@/lib/security/codes";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/display";
import { Icon } from "@/components/icon/Icon";
import { AuthenticatorRow, DeviceSignOut, SignOutOthers } from "./SecurityClient";

export const metadata: Metadata = { title: "Security · Depod" };

/* Figma 61a Security settings / 61b authenticator on. */
export default function SecurityPage() {
  return (
    <main className="flex max-w-[780px] flex-col gap-6">
      <h1 className="text-display-40 text-text-primary">Security</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-bg-subtle" />}>
        <Content />
      </Suspense>
    </main>
  );
}

function Row({ title, body, action }: { title: string; body: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border-default bg-bg-surface px-5 py-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-label-13 text-text-primary">{title}</span>
        <span className="text-body-15 text-text-secondary">{body}</span>
      </div>
      {action}
    </div>
  );
}

const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins} minutes ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

// Shows the first two parts of an IPv4 address, like the design (102.89.xx.xx).
const maskIp = (ip: string | null) => {
  if (!ip) return null;
  const parts = ip.split(".");
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.xx.xx` : ip.split(":").slice(0, 2).join(":") + ":…";
};

async function Content() {
  const v = await verifiedUser();
  if (!v) redirect("/auth/continue");
  const { supabase, user, sessionId } = v;

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp.find((f) => f.status === "verified");
  const left = factor ? await recoveryCodesLeft(user.id) : 0;
  const added = factor ? new Date(factor.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

  const { data: devices } = await supabaseAdmin()
    .from("sessions")
    .select("id, device, browser, city, country, ip, last_seen_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("last_seen_at", { ascending: false });

  const alwaysOn = (
    <Badge icon="lock">Always on</Badge>
  );

  return (
    <>
      <section className="flex flex-col gap-4">
        <h2 className="text-heading-20 text-text-primary">Two-step verification</h2>
        <Row title="Email codes" body="A 6-digit code by email when you sign in on a new device." action={alwaysOn} />
        <AuthenticatorRow on={!!factor} detail={factor ? `Added ${added} · ${left} of 10 recovery codes left` : undefined} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-heading-20 text-text-primary">Sign-in alerts</h2>
        <Row title="Email me when someone signs in on a new device" body="Shows the device, browser, approximate location and IP address." action={alwaysOn} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-heading-20 text-text-primary">Where you&apos;re signed in</h2>
        <ul className="divide-y divide-border-default overflow-hidden rounded-2xl border border-border-default bg-bg-surface">
          {(devices ?? []).map((d) => {
            const place = [d.city, d.country].filter(Boolean).join(", ");
            const here = d.id === sessionId;
            const meta = [place || null, maskIp(d.ip as string | null), here ? null : ago(d.last_seen_at)].filter(Boolean).join(" · ");
            return (
              <li key={d.id} className="flex items-center gap-4 px-5 py-4">
                <Icon name="eye" className="text-icon-primary" />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-label-13 text-text-primary">
                    {d.browser} on {d.device}
                  </span>
                  <span className="text-body-15 text-text-secondary">{meta}</span>
                </div>
                {here ? <Badge>This device</Badge> : <DeviceSignOut id={d.id} />}
              </li>
            );
          })}
        </ul>
        {(devices?.length ?? 0) > 1 && <SignOutOthers />}
      </section>
    </>
  );
}
