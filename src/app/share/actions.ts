"use server";

import { redirect } from "next/navigation";
import { verifiedUser } from "@/lib/security/flow";
import { shareCol, shareState, type ShareKind } from "@/lib/data/share";

/*
 * 16 Share, link section. On: reuse the live link or make one. Off: revoke every live link,
 * so a copied link stops working at once (08 shows No access, 24).
 */
export async function setShareLink(kind: ShareKind, id: string, on: boolean) {
  const v = await verifiedUser();
  if (!v) redirect("/auth/continue");
  const { supabase, user } = v;
  if (kind !== "moodboard" && kind !== "project") throw new Error("bad_kind");
  const col = shareCol(kind);
  if (on) {
    const now = await shareState(supabase, kind, id);
    if (now.enabled) return now;
    const { error } = await supabase.from("share_links").insert({ [col]: id, created_by: user.id });
    if (error) throw new Error("share_failed");
  } else {
    const { error } = await supabase.from("share_links").update({ revoked: true }).eq(col, id).eq("revoked", false);
    if (error) throw new Error("share_failed");
  }
  return shareState(supabase, kind, id);
}
