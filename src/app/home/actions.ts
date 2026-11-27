"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifiedUser } from "@/lib/security/flow";
import { currentWorkspace } from "@/lib/data/workspace";

/* Moodboard actions from Home (18 New moodboard, 38 Move, 30 Delete). Results, not throws, so the UI can show 19. */
export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: "limit" | "failed" | "name" };

async function me() {
  const v = await verifiedUser();
  if (!v) redirect("/auth/continue?next=/home");
  return v;
}

export async function createMoodboard(name: string, projectId: string | null): Promise<Result<{ id: string }>> {
  const { supabase, user } = await me();
  const ws = await currentWorkspace(supabase, user.id);
  if (!ws) return { ok: false, error: "failed" };
  const { data, error } = await supabase
    .from("moodboards")
    .insert({ workspace_id: ws.id, project_id: projectId || null, name: name.trim().slice(0, 120) || "Untitled moodboard", created_by: user.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message.includes("plan_limit") ? "limit" : "failed" };
  revalidatePath("/home");
  return { ok: true, id: data.id };
}

export async function moveMoodboard(id: string, projectId: string | null): Promise<Result> {
  const { supabase } = await me();
  const { error } = await supabase.from("moodboards").update({ project_id: projectId }).eq("id", id);
  if (error) return { ok: false, error: "failed" };
  revalidatePath("/home");
  return { ok: true };
}

/** 30: the name must be typed to confirm. Deletes the images in Storage too. */
export async function deleteMoodboard(id: string, typedName: string): Promise<Result> {
  const { supabase } = await me();
  const { data: mb } = await supabase.from("moodboards").select("name, workspace_id").eq("id", id).maybeSingle();
  if (!mb) return { ok: false, error: "failed" };
  if (typedName.trim() !== mb.name.trim()) return { ok: false, error: "name" };
  const { data: imgs } = await supabase.from("images").select("file_path").eq("moodboard_id", id);
  const { error } = await supabase.from("moodboards").delete().eq("id", id);
  if (error) return { ok: false, error: "failed" };
  const paths = (imgs ?? []).map((i) => i.file_path);
  for (let i = 0; i < paths.length; i += 100) await supabase.storage.from("images").remove(paths.slice(i, i + 100));
  revalidatePath("/home");
  return { ok: true };
}
