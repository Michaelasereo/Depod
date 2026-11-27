"use server";

import { redirect } from "next/navigation";
import { verifiedUser } from "@/lib/security/flow";
import type { BentoDoc } from "@/lib/bento/doc";

/* Saves for the project canvas. Row-level security decides who may write; this only shapes the data. */
export async function saveProjectBento(projectId: string, doc: BentoDoc) {
  const v = await verifiedUser();
  if (!v) redirect("/auth/continue");
  const { supabase } = v;
  // Only images from this project's moodboards may sit in its bento.
  const { data: boards } = await supabase.from("moodboards").select("id").eq("project_id", projectId);
  const ids = (boards ?? []).map((b) => b.id);
  const { data: imgs } = ids.length ? await supabase.from("images").select("id").in("moodboard_id", ids) : { data: [] };
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
    .eq("project_id", projectId);
  if (error) throw new Error("save_failed");
  await supabase.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId);
}
