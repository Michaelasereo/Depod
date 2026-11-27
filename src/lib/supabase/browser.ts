"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Supabase in the browser (acts as the signed-in user). Used for direct uploads to Storage. */
export function supabaseBrowser() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
