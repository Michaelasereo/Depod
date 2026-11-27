import { NextResponse, type NextRequest } from "next/server";
import { verifiedUser } from "@/lib/security/flow";

/* Temporary until Home (Phase 3): creates an "Untitled moodboard" in your personal workspace and opens it. */
export async function GET(request: NextRequest) {
  const v = await verifiedUser();
  if (!v) return NextResponse.redirect(new URL("/auth/continue?next=/m/new", request.url));
  const { supabase, user } = v;
  const { data: ws } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).eq("kind", "personal").maybeSingle();
  if (!ws) return NextResponse.redirect(new URL("/settings/security", request.url));
  const { data: mb, error } = await supabase
    .from("moodboards")
    .insert({ workspace_id: ws.id, name: "Untitled moodboard", created_by: user.id })
    .select("id")
    .single();
  if (error || !mb) return NextResponse.redirect(new URL("/settings/security", request.url));
  return NextResponse.redirect(new URL(`/m/${mb.id}`, request.url));
}
