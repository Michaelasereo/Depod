import type { Metadata } from "next";
import { Suspense } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { parseDoc } from "@/lib/bento/doc";
import { displayName, initialsOf } from "@/lib/data/workspace";
import type { CanvasImage, MoodboardData, ProjectData } from "@/components/canvas/types";
import { NoAccess } from "@/components/app/NoAccess";
import { SharedClient } from "./SharedClient";

export const metadata: Metadata = { title: "Shared · Depod", robots: { index: false, follow: false } };

/*
 * Figma 08 Shared view (signed in), 08b (signed out), 24 when the link is off or wrong.
 * Anyone with a live link can view. Data is read on the server with the secret key, after the token checks out;
 * images go out as signed URLs that expire in an hour.
 */
export default function SharedPage({ params }: PageProps<"/s/[token]">) {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-bg-canvas" />}>
      <Load params={params} />
    </Suspense>
  );
}

const SIGNED_FOR = 60 * 60;

async function Load({ params }: { params: PageProps<"/s/[token]">["params"] }) {
  const { token } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewer = user ? { email: user.email ?? "", initials: initialsOf(displayName(null, user.email)) } : null;
  if (!/^[0-9a-f]{48}$/.test(token)) return <NoAccess link email={viewer?.email} />;

  const admin = supabaseAdmin();
  const { data: link } = await admin.from("share_links").select("moodboard_id, project_id, created_by, revoked").eq("token", token).maybeSingle();
  if (!link || link.revoked) return <NoAccess link email={viewer?.email} />;

  const { data: sharer } = link.created_by ? await admin.from("profiles").select("name").eq("user_id", link.created_by).maybeSingle() : { data: null };
  const by = (sharer?.name || "a Depod user").split(" ")[0];
  const shared = { by, signedIn: !!user, initials: viewer?.initials, signInHref: `/sign-in?next=/s/${token}` };

  const sign = async (paths: string[]) => {
    const { data } = paths.length ? await admin.storage.from("images").createSignedUrls(paths, SIGNED_FOR) : { data: [] };
    return new Map((data ?? []).map((s) => [s.path, s.signedUrl]));
  };
  type Row = { id: string; moodboard_id: string; file_path: string; width: number; height: number; name: string | null; created_at?: string };
  const toImage = (urls: Map<string | null, string | null>) => (i: Row): CanvasImage => ({
    id: i.id,
    url: urls.get(i.file_path) ?? "",
    width: i.width,
    height: i.height,
    name: i.name ?? "Image",
  });

  if (link.moodboard_id) {
    const [{ data: mb }, { data: images }, { data: bento }] = await Promise.all([
      admin.from("moodboards").select("id, name, starter_layout").eq("id", link.moodboard_id).maybeSingle(),
      admin.from("images").select("id, moodboard_id, file_path, width, height, name, created_at").eq("moodboard_id", link.moodboard_id).order("created_at"),
      admin.from("bentos").select("layout").eq("moodboard_id", link.moodboard_id).maybeSingle(),
    ]);
    if (!mb) return <NoAccess link email={viewer?.email} />;
    const urls = await sign((images ?? []).map((i) => i.file_path));
    const data: MoodboardData = {
      id: mb.id,
      name: mb.name,
      starter: mb.starter_layout,
      images: (images ?? []).map(toImage(urls)),
      doc: parseDoc(bento?.layout),
      canEdit: false,
      people: [],
      plan: "free",
      imageLimit: null,
      markLocked: true,
    };
    return <SharedClient kind="moodboard" data={data} shared={shared} />;
  }

  const pid = link.project_id!;
  const [{ data: project }, { data: boards }, { data: bento }] = await Promise.all([
    admin.from("projects").select("id, name").eq("id", pid).maybeSingle(),
    admin.from("moodboards").select("id, name, created_at").eq("project_id", pid).order("created_at"),
    admin.from("bentos").select("layout").eq("project_id", pid).maybeSingle(),
  ]);
  if (!project) return <NoAccess link email={viewer?.email} />;
  const ids = (boards ?? []).map((b) => b.id);
  const [{ data: images }, { data: boardBentos }] = ids.length
    ? await Promise.all([
        admin.from("images").select("id, moodboard_id, file_path, width, height, name").in("moodboard_id", ids),
        admin.from("bentos").select("moodboard_id, layout").in("moodboard_id", ids),
      ])
    : [{ data: [] as Row[] }, { data: [] as { moodboard_id: string; layout: unknown }[] }];
  // Only images that appear in a bento are shown on a shared project.
  const docs = new Map(ids.map((id) => [id, parseDoc(boardBentos?.find((b) => b.moodboard_id === id)?.layout)]));
  const projectDoc = parseDoc(bento?.layout);
  const visible = new Set([...projectDoc.tiles, ...[...docs.values()].flatMap((d) => d.tiles)].map((t) => t.imageId));
  const rows = (images ?? []).filter((i) => visible.has(i.id));
  const urls = await sign(rows.map((i) => i.file_path));
  const data: ProjectData = {
    id: project.id,
    name: project.name,
    boards: (boards ?? []).map((b) => ({ id: b.id, name: b.name, tiles: docs.get(b.id)!.tiles, images: rows.filter((i) => i.moodboard_id === b.id).map(toImage(urls)) })),
    doc: projectDoc,
    canEdit: false,
    people: [],
    share: { enabled: true, url: null },
  };
  return <SharedClient kind="project" data={data} shared={shared} />;
}
