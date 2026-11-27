"use server";

import { redirect } from "next/navigation";
import { verifiedUser } from "@/lib/security/flow";
import type { BentoDoc } from "@/lib/bento/doc";
import type { StarterLayout } from "@/lib/bento/layout";

/* Saves for the moodboard canvas. Row-level security decides who may write; these only shape the data. */

async function me() {
  const v = await verifiedUser();
  if (!v) redirect("/auth/continue");
  return v;
}

const STARTERS: StarterLayout[] = ["hero-left", "hero-top", "even-grid", "mosaic"];

export async function saveBento(moodboardId: string, doc: BentoDoc) {
  const { supabase } = await me();
  const { data: imgs } = await supabase.from("images").select("id").eq("moodboard_id", moodboardId);
  const valid = new Set((imgs ?? []).map((i) => i.id));
  const tiles = (doc.tiles ?? [])
    .filter((t) => valid.has(t.imageId))
    .map((t) => ({
      imageId: t.imageId,
      x: Math.max(0, Math.floor(t.x)),
      y: Math.max(0, Math.floor(t.y)),
      w: Math.min(4, Math.max(1, Math.floor(t.w))),
      h: Math.min(8, Math.max(1, Math.floor(t.h))),
      locked: !!t.locked,
    }));
  const { error } = await supabase
    .from("bentos")
    .update({ layout: { v: 1, seed: Math.floor(Number(doc.seed) || 1), tiles } })
    .eq("moodboard_id", moodboardId);
  if (error) throw new Error("save_failed");
  await supabase.from("moodboards").update({ updated_at: new Date().toISOString() }).eq("id", moodboardId);
}

export async function setStarter(moodboardId: string, starter: StarterLayout) {
  if (!STARTERS.includes(starter)) throw new Error("bad_starter");
  const { supabase } = await me();
  const { error } = await supabase.from("moodboards").update({ starter_layout: starter }).eq("id", moodboardId);
  if (error) throw new Error("save_failed");
}

/** Records an image the browser already uploaded to Storage, and returns it with a signed URL. */
export async function recordImage(
  moodboardId: string,
  file: { path: string; width: number; height: number; hash: string; name: string },
) {
  const { supabase, user } = await me();
  const { data: mb } = await supabase.from("moodboards").select("workspace_id").eq("id", moodboardId).single();
  if (!mb || !file.path.startsWith(`${mb.workspace_id}/${moodboardId}/`)) throw new Error("bad_path");
  const { data, error } = await supabase
    .from("images")
    .insert({
      moodboard_id: moodboardId,
      file_path: file.path,
      width: Math.round(file.width),
      height: Math.round(file.height),
      hash: file.hash,
      name: file.name.slice(0, 200),
      added_by: user.id,
    })
    .select("id, created_at")
    .single();
  if (error || !data) throw new Error("record_failed");
  const { data: signed } = await supabase.storage.from("images").createSignedUrl(file.path, 60 * 60 * 6);
  return { id: data.id, url: signed?.signedUrl ?? "", addedAt: data.created_at };
}

export async function deleteImage(imageId: string) {
  const { supabase } = await me();
  const { data: img } = await supabase.from("images").select("file_path").eq("id", imageId).single();
  if (!img) return;
  const { error } = await supabase.from("images").delete().eq("id", imageId);
  if (error) throw new Error("delete_failed");
  await supabase.storage.from("images").remove([img.file_path]);
}
