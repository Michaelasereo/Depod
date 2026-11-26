import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, supabaseUrl } from "../env";

/** Server-only client with the secret key. Bypasses row-level security: use for security tables and server tasks only. */
export function supabaseAdmin() {
  return createClient(supabaseUrl(), env("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
