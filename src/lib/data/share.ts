import "server-only";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ShareKind = "moodboard" | "project";
export const shareCol = (kind: ShareKind) => (kind === "moodboard" ? "moodboard_id" : "project_id");

/** The site origin for links, from the request (works on previews and production alike). */
export async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** The live (not revoked) link for a moodboard or project, if any. */
export async function shareState(supabase: SupabaseClient, kind: ShareKind, id: string) {
  const { data } = await supabase.from("share_links").select("token").eq(shareCol(kind), id).eq("revoked", false).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return { enabled: !!data, url: data ? `${await origin()}/s/${data.token}` : null };
}
