import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/* Google and email links land here with a one-time code. Expired or reused links go to Figma 25. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "";
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(`/auth/continue?next=${encodeURIComponent(next)}`, url.origin));
  }
  return NextResponse.redirect(new URL("/link-not-working", url.origin));
}
