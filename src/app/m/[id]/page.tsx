import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { verifiedUser } from "@/lib/security/flow";
import { parseDoc } from "@/lib/bento/doc";
import type { StarterLayout } from "@/lib/bento/layout";
import type { CanvasImage } from "@/components/canvas/types";
import { LIMITS, type Plan } from "@/lib/data/plans";
import { Editor } from "./Editor";

export const metadata: Metadata = { title: "Moodboard · Depod" };

const initialsOf = (name: string) =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");

/* Figma 4 · Moodboard editor. */
export default function MoodboardPage({ params }: PageProps<"/m/[id]">) {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-bg-canvas" />}>
      <Load params={params} />
    </Suspense>
  );
}

async function Load({ params }: { params: PageProps<"/m/[id]">["params"] }) {
  const { id } = await params;
  const v = await verifiedUser();
  if (!v) redirect(`/auth/continue?next=/m/${id}`);
  const { supabase, user } = v;

  const { data: mb } = await supabase.from("moodboards").select("id, name, workspace_id, project_id, starter_layout").eq("id", id).maybeSingle();
  if (!mb) notFound();

  const [{ data: project }, { data: images }, { data: bento }, { data: me }, { data: members }, { data: ws }] = await Promise.all([
    mb.project_id ? supabase.from("projects").select("name").eq("id", mb.project_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("images").select("id, file_path, width, height, hash, name, added_by, created_at").eq("moodboard_id", id).order("created_at"),
    supabase.from("bentos").select("layout").eq("moodboard_id", id).maybeSingle(),
    supabase.from("members").select("role").eq("workspace_id", mb.workspace_id).eq("user_id", user.id).maybeSingle(),
    supabase.from("members").select("user_id").eq("workspace_id", mb.workspace_id).limit(3),
    supabase.from("workspaces").select("plan").eq("id", mb.workspace_id).maybeSingle(),
  ]);
  const plan: Plan = ws?.plan && ws.plan in LIMITS ? (ws.plan as Plan) : "free";

  const ids = [...new Set([...(images ?? []).map((i) => i.added_by), ...(members ?? []).map((m) => m.user_id)].filter(Boolean))] as string[];
  const { data: profiles } = ids.length ? await supabase.from("profiles").select("user_id, name").in("user_id", ids) : { data: [] };
  const nameOf = (uid: string | null) => (uid && profiles?.find((p) => p.user_id === uid)?.name) || (uid === user.id ? user.email ?? "You" : "Someone");

  const paths = (images ?? []).map((i) => i.file_path);
  const { data: signed } = paths.length ? await supabase.storage.from("images").createSignedUrls(paths, 60 * 60 * 6) : { data: [] };
  const urlOf = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const canvasImages: CanvasImage[] = (images ?? []).map((i) => ({
    id: i.id,
    url: urlOf.get(i.file_path) ?? "",
    width: i.width,
    height: i.height,
    name: i.name ?? "Image",
    hash: i.hash,
    addedBy: nameOf(i.added_by),
    addedAt: i.created_at,
  }));

  const userName = nameOf(user.id);
  return (
    <Editor
      workspaceId={mb.workspace_id}
      userName={userName}
      data={{
        id: mb.id,
        name: mb.name,
        projectName: project?.name ?? undefined,
        starter: mb.starter_layout as StarterLayout,
        images: canvasImages,
        doc: parseDoc(bento?.layout),
        canEdit: me?.role === "owner" || me?.role === "editor",
        plan,
        imageLimit: LIMITS[plan].images,
        markLocked: LIMITS[plan].mark,
        people: (members ?? []).map((m) => ({ initials: initialsOf(nameOf(m.user_id)), name: nameOf(m.user_id) })),
      }}
    />
  );
}
