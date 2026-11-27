"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifiedUser } from "@/lib/security/flow";
import { currentWorkspace } from "@/lib/data/workspace";

/* Project actions: 37a New, 37b Rename, 37c Delete. Results, not throws, so dialogs can show errors. */
export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: "failed" | "name" | "owner" };

async function me() {
  const v = await verifiedUser();
  if (!v) redirect("/auth/continue?next=/projects");
  return v;
}

export async function createProject(name: string): Promise<Result<{ id: string }>> {
  const { supabase, user } = await me();
  const ws = await currentWorkspace(supabase, user.id);
  if (!ws) return { ok: false, error: "failed" };
  const { data, error } = await supabase
    .from("projects")
    .insert({ workspace_id: ws.id, name: name.trim().slice(0, 120) || "Untitled project", created_by: user.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: "failed" };
  revalidatePath("/projects");
  return { ok: true, id: data.id };
}

export async function renameProject(id: string, name: string): Promise<Result> {
  const { supabase } = await me();
  const clean = name.trim().slice(0, 120);
  if (!clean) return { ok: false, error: "name" };
  const { error } = await supabase.from("projects").update({ name: clean, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: "failed" };
  revalidatePath("/projects");
  revalidatePath(`/p/${id}`);
  return { ok: true };
}

/** 37c: owners only. Deletes the project's moodboards, their images in Storage, and the project bento. */
export async function deleteProject(id: string, typedName: string): Promise<Result> {
  const { supabase, user } = await me();
  const { data: p } = await supabase.from("projects").select("name, workspace_id").eq("id", id).maybeSingle();
  if (!p) return { ok: false, error: "failed" };
  if (typedName.trim() !== p.name.trim()) return { ok: false, error: "name" };
  const { data: role } = await supabase.from("members").select("role").eq("workspace_id", p.workspace_id).eq("user_id", user.id).maybeSingle();
  if (role?.role !== "owner") return { ok: false, error: "owner" };

  const { data: boards } = await supabase.from("moodboards").select("id").eq("project_id", id);
  const boardIds = (boards ?? []).map((b) => b.id);
  const { data: imgs } = boardIds.length ? await supabase.from("images").select("file_path").in("moodboard_id", boardIds) : { data: [] };
  if (boardIds.length) {
    const { error } = await supabase.from("moodboards").delete().in("id", boardIds);
    if (error) return { ok: false, error: "failed" };
  }
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return { ok: false, error: "failed" };
  const paths = (imgs ?? []).map((i) => i.file_path);
  for (let i = 0; i < paths.length; i += 100) await supabase.storage.from("images").remove(paths.slice(i, i + 100));
  revalidatePath("/projects");
  revalidatePath("/home");
  return { ok: true };
}
