import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { verifiedUser } from "@/lib/security/flow";
import { parseDoc } from "@/lib/bento/doc";
import { initialsOf } from "@/lib/data/workspace";
import { shareState } from "@/lib/data/share";
import type { CanvasImage, ProjectBoard } from "@/components/canvas/types";
import { NoAccess } from "@/components/app/NoAccess";
import { ProjectEditor } from "./Editor";

export const metadata: Metadata = { title: "Project · Depod" };

/* Figma 05 Project canvas, 23 empty. */
export default function ProjectPage({ params }: PageProps<"/p/[id]">) {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-bg-canvas" />}>
      <Load params={params} />
    </Suspense>
  );
}

async function Load({ params }: { params: PageProps<"/p/[id]">["params"] }) {
  const { id } = await params;
  const v = await verifiedUser();
  if (!v) redirect(`/auth/continue?next=/p/${id}`);
  const { supabase, user } = v;

  const { data: project } = await supabase.from("projects").select("id, name, workspace_id").eq("id", id).maybeSingle();
  if (!project) return <NoAccess email={user.email ?? ""} />;

  const [{ data: boards }, { data: bento }, { data: me }, { data: members }] = await Promise.all([
    supabase.from("moodboards").select("id, name, created_at").eq("project_id", id).order("created_at"),
    supabase.from("bentos").select("layout").eq("project_id", id).maybeSingle(),
    supabase.from("members").select("role").eq("workspace_id", project.workspace_id).eq("user_id", user.id).maybeSingle(),
    supabase.from("members").select("user_id").eq("workspace_id", project.workspace_id).limit(3),
  ]);
  const ids = (boards ?? []).map((b) => b.id);
  const [{ data: images }, { data: boardBentos }] = ids.length
    ? await Promise.all([
        supabase.from("images").select("id, moodboard_id, file_path, width, height, name").in("moodboard_id", ids),
        supabase.from("bentos").select("moodboard_id, layout").in("moodboard_id", ids),
      ])
    : [{ data: [] }, { data: [] }];

  const paths = (images ?? []).map((i) => i.file_path);
  const { data: signed } = paths.length ? await supabase.storage.from("images").createSignedUrls(paths, 60 * 60 * 6) : { data: [] };
  const urlOf = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const toImage = (i: NonNullable<typeof images>[number]): CanvasImage => ({ id: i.id, url: urlOf.get(i.file_path) ?? "", width: i.width, height: i.height, name: i.name ?? "Image" });

  const cards: ProjectBoard[] = (boards ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    tiles: parseDoc(boardBentos?.find((x) => x.moodboard_id === b.id)?.layout).tiles,
    images: (images ?? []).filter((i) => i.moodboard_id === b.id).map(toImage),
  }));

  const uids = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = uids.length ? await supabase.from("profiles").select("user_id, name").in("user_id", uids) : { data: [] };
  const nameOf = (uid: string) => profiles?.find((p) => p.user_id === uid)?.name || (uid === user.id ? user.email ?? "You" : "Someone");

  return (
    <ProjectEditor
      data={{
        id: project.id,
        name: project.name,
        boards: cards,
        doc: parseDoc(bento?.layout),
        canEdit: me?.role === "owner" || me?.role === "editor",
        people: uids.map((u) => ({ initials: initialsOf(nameOf(u)), name: nameOf(u) })),
        share: await shareState(supabase, "project", project.id),
      }}
    />
  );
}
