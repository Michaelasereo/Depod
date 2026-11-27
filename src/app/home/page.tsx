import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { verifiedUser } from "@/lib/security/flow";
import { currentWorkspace, displayName, initialsOf } from "@/lib/data/workspace";
import { LIMITS } from "@/lib/data/plans";
import { parseDoc } from "@/lib/bento/doc";
import { TopNav } from "@/components/app/app";
import { HomeClient, type HomeBoard } from "./HomeClient";

export const metadata: Metadata = { title: "Home · Depod" };

/* Figma 04 Home, 04b first time, 04c filter shows nothing. */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg-canvas">
      <Suspense fallback={<div className="h-16 border-b border-border-default bg-bg-surface" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const v = await verifiedUser();
  if (!v) redirect("/auth/continue?next=/home");
  const { supabase, user } = v;
  const ws = await currentWorkspace(supabase, user.id);
  if (!ws) redirect("/settings/security");

  const [{ data: profile }, { data: boards }, { data: projects }] = await Promise.all([
    supabase.from("profiles").select("name").eq("user_id", user.id).maybeSingle(),
    supabase.from("moodboards").select("id, name, project_id, created_by, created_at, updated_at").eq("workspace_id", ws.id),
    supabase.from("projects").select("id, name").eq("workspace_id", ws.id).order("name"),
  ]);
  const ids = (boards ?? []).map((b) => b.id);
  const [{ data: images }, { data: bentos }] = ids.length
    ? await Promise.all([
        supabase.from("images").select("id, moodboard_id, file_path").in("moodboard_id", ids),
        supabase.from("bentos").select("moodboard_id, layout").in("moodboard_id", ids),
      ])
    : [{ data: [] }, { data: [] }];

  // Card thumbnails: the first seven tiles of each bento, or its first references.
  const pathOf = new Map((images ?? []).map((i) => [i.id, i.file_path]));
  const thumbs = new Map<string, string[]>();
  for (const b of boards ?? []) {
    const doc = parseDoc(bentos?.find((x) => x.moodboard_id === b.id)?.layout);
    const fromBento = [...doc.tiles].sort((a, c) => a.y - c.y || a.x - c.x).map((t) => pathOf.get(t.imageId));
    const fromRefs = (images ?? []).filter((i) => i.moodboard_id === b.id).map((i) => i.file_path);
    thumbs.set(b.id, [...new Set([...fromBento, ...fromRefs].filter(Boolean) as string[])].slice(0, 7));
  }
  const allPaths = [...new Set([...thumbs.values()].flat())];
  const { data: signed } = allPaths.length ? await supabase.storage.from("images").createSignedUrls(allPaths, 60 * 60 * 6) : { data: [] };
  const urlOf = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const name = displayName(profile?.name, user.email);
  const cards: HomeBoard[] = (boards ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    projectId: b.project_id,
    mine: b.created_by === user.id,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
    imageCount: (images ?? []).filter((i) => i.moodboard_id === b.id).length,
    thumbs: (thumbs.get(b.id) ?? []).map((p) => urlOf.get(p) ?? "").filter(Boolean),
  }));

  return (
    <>
      <TopNav current="home" workspace={ws.name === "Personal" ? `${name.split(" ")[0]} (personal)` : ws.name} initials={initialsOf(name)} />
      <HomeClient
        firstName={name.split(" ")[0]}
        workspaceId={ws.id}
        boards={cards}
        projects={projects ?? []}
        limits={LIMITS[ws.plan]}
        plan={ws.plan}
      />
    </>
  );
}
