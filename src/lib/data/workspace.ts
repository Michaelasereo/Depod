import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan } from "./plans";

/** The workspace Home shows. Personal for now; the workspace switcher (50) comes with teams in Phase 5. */
export async function currentWorkspace(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("workspaces").select("id, name, kind, plan").eq("owner_id", userId).eq("kind", "personal").maybeSingle();
  return data as { id: string; name: string; kind: "personal" | "team"; plan: Plan } | null;
}

export const displayName = (name: string | null | undefined, email: string | null | undefined) =>
  (name && name.trim()) || (email ? email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "there");

export const initialsOf = (name: string) =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");
