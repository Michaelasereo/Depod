import { Suspense } from "react";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/app/app";
import { verifiedUser } from "@/lib/security/flow";
import { SettingsNav } from "./SettingsNav";

/* Figma 6 · Settings: top nav, "Settings" with the side menu, then the page. */
export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <div className="min-h-screen bg-bg-canvas">
      <Suspense fallback={<div className="h-16 border-b border-border-default bg-bg-surface" />}>
        <Nav />
      </Suspense>
      <div className="mx-auto flex max-w-[1440px] gap-10 px-8 py-8">
        <aside className="flex w-[224px] shrink-0 flex-col gap-4 border-r border-border-default pr-6">
          <h2 className="text-heading-20 text-text-primary">Settings</h2>
          <SettingsNav />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

async function Nav() {
  const v = await verifiedUser();
  if (!v) redirect("/auth/continue");
  const { data: profile } = await v.supabase.from("profiles").select("name").eq("user_id", v.user.id).maybeSingle();
  const { data: ws } = await v.supabase.from("workspaces").select("name, kind").order("created_at").limit(1).maybeSingle();
  const name = profile?.name || v.user.email || "";
  const initials = name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s: string) => s[0]!.toUpperCase()).join("");
  return <TopNav workspace={ws?.name ?? "Personal"} initials={initials} />;
}
