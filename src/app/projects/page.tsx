import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { verifiedUser } from "@/lib/security/flow";
import { currentWorkspace, displayName, initialsOf } from "@/lib/data/workspace";
import { parseDoc } from "@/lib/bento/doc";
import { TopNav } from "@/components/app/app";
import { ProjectsClient, type ProjectRow } from "./ProjectsClient";

export const metadata: Metadata = { title: "Projects · Depod" };

/* Figma 36 Projects list, 36b none yet. */
export default function ProjectsPage() {
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
  if (!v) redirect("/auth/continue?next=/projects");
  const { supabase, user } = v;
  const ws = await currentWorkspace(supabase, user.id);
  if (!ws) redirect("/settings/security");

  const [{ data: profile }, { data: projects }, { data: boards }, { data: role }] = await Promise.all([
    supabase.from("profiles").select("name").eq("user_id", user.id).maybeSingle(),
    supabase.from("projects").select("id, name, updated_at").eq("workspace_id", ws.id),
    supabase.from("moodboards").select("id, project_id, updated_at").eq("workspace_id", ws.id).not("project_id", "is", null),
    supabase.from("members").select("role").eq("workspace_id", ws.id).eq("user_id", user.id).maybeSingle(),
  ]);
  const pids = (projects ?? []).map((p) => p.id);
  const bids = (boards ?? []).map((b) => b.id);
  const [{ data: bentos }, { data: images }] = await Promise.all([
    pids.length || bids.length
      ? supabase.from("bentos").select("project_id, moodboard_id, layout").or(`project_id.in.(${pids.join(",") || "00000000-0000-0000-0000-000000000000"}),moodboard_id.in.(${bids.join(",") || "00000000-0000-0000-0000-000000000000"})`)
      : Promise.resolve({ data: [] as { project_id: string | null; moodboard_id: string | null; layout: unknown }[] }),
    bids.length ? supabase.from("images").select("id, moodboard_id, file_path").in("moodboard_id", bids) : Promise.resolve({ data: [] as { id: string; moodboard_id: string; file_path: string }[] }),
  ]);

  // Thumbnails: the project bento first, then the tiles of its moodboards' bentos, then any reference.
  const pathOf = new Map((images ?? []).map((i) => [i.id, i.file_path]));
  const ordered = (layout: unknown) => [...parseDoc(layout).tiles].sort((a, b) => a.y - b.y || a.x - b.x).map((t) => pathOf.get(t.imageId));
  const thumbs = new Map<string, string[]>();
  for (const p of projects ?? []) {
    const mine = (boards ?? []).filter((b) => b.project_id === p.id).map((b) => b.id);
    const list = [
      ...ordered(bentos?.find((b) => b.project_id === p.id)?.layout),
      ...mine.flatMap((id) => ordered(bentos?.find((b) => b.moodboard_id === id)?.layout)),
      ...(images ?? []).filter((i) => mine.includes(i.moodboard_id)).map((i) => i.file_path),
    ];
    thumbs.set(p.id, [...new Set(list.filter(Boolean) as string[])].slice(0, 3));
  }
  const all = [...new Set([...thumbs.values()].flat())];
  const { data: signed } = all.length ? await supabase.storage.from("images").createSignedUrls(all, 60 * 60 * 6) : { data: [] };
  const urlOf = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const rows: ProjectRow[] = (projects ?? []).map((p) => {
    const mine = (boards ?? []).filter((b) => b.project_id === p.id);
    const edited = [p.updated_at, ...mine.map((b) => b.updated_at)].sort().at(-1)!;
    return {
      id: p.id,
      name: p.name,
      boardCount: mine.length,
      editedAt: edited,
      thumbs: (thumbs.get(p.id) ?? []).map((x) => urlOf.get(x) ?? "").filter(Boolean),
    };
  });
  rows.sort((a, b) => b.editedAt.localeCompare(a.editedAt));

  const name = displayName(profile?.name, user.email);
  return (
    <>
      <TopNav current="projects" workspace={ws.name === "Personal" ? `${name.split(" ")[0]} (personal)` : ws.name} initials={initialsOf(name)} />
      <ProjectsClient projects={rows} isOwner={role?.role === "owner"} canEdit={role?.role === "owner" || role?.role === "editor"} />
    </>
  );
}
