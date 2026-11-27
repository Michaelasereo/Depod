import "server-only";
import { supabaseServer } from "../supabase/server";
import { supabaseAdmin } from "../supabase/admin";
import { codeEmail, sendEmail, signInAlertEmail } from "../email/send";
import { issueEmailCode } from "./codes";
import { deviceToken, markStepDone, requestDetails, sha256, stepSessionId } from "./device";

/*
 * The second step after Supabase sign-in (PRD → Security):
 * - Trusted device (30 days): no second step.
 * - Authenticator app set up: its code replaces email codes.
 * - Email-link sign-in: no email code (the link already proves the email).
 * - Google sign-in on an untrusted device: a 6-digit email code.
 * Sign-in alerts go out once per new device, after the second step.
 */
export const AFTER_SIGN_IN = "/settings/security"; // becomes /home in Phase 3
const TRUST_DAYS = 30;

export type Step = "done" | "email" | "authenticator";

async function signedInUser() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

/** How this session signed in, from the token's amr claim. */
async function signInMethod(): Promise<"link" | "oauth" | "other"> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const amr = (data?.claims?.amr ?? []) as Array<{ method: string } | string>;
  const methods = amr.map((a) => (typeof a === "string" ? a : a.method));
  if (methods.includes("oauth")) return "oauth";
  if (methods.some((m) => m === "otp" || m === "magiclink" || m === "email")) return "link";
  return "other";
}

/** This browser's row in public.sessions for the user, created on first sign-in here. */
export async function deviceSession(userId: string) {
  const db = supabaseAdmin();
  const tokenHash = sha256(await deviceToken());
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const details = { ...(await requestDetails()), auth_session_id: (claims?.claims?.session_id as string | undefined) ?? null };
  const { data: existing } = await db
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("device_token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle();
  if (existing) {
    const { data } = await db.from("sessions").update({ ...details, last_seen_at: new Date().toISOString() }).eq("id", existing.id).select("*").single();
    return data!;
  }
  const { data } = await db.from("sessions").insert({ user_id: userId, device_token_hash: tokenHash, ...details }).select("*").single();
  return data!;
}

export async function hasAuthenticator(): Promise<boolean> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.mfa.listFactors();
  return (data?.totp ?? []).some((f) => f.status === "verified");
}

/** Runs right after sign-in. Decides the second step and sends the email code when needed. */
export async function startSecondStep(): Promise<Step> {
  const { user } = await signedInUser();
  if (!user) throw new Error("Not signed in");
  const session = await deviceSession(user.id);
  const trusted = session.trusted_until && new Date(session.trusted_until) > new Date();
  if (trusted) {
    await finishSecondStep(false);
    return "done";
  }
  if (await hasAuthenticator()) return "authenticator";
  if ((await signInMethod()) === "link") {
    await finishSecondStep(false);
    return "done";
  }
  await sendEmailCode();
  return "email";
}

export async function sendEmailCode() {
  const { user } = await signedInUser();
  if (!user?.email) throw new Error("Not signed in");
  const code = await issueEmailCode(user.id);
  await sendEmail(codeEmail(user.email, code));
}

/** Marks the second step done on this device, trusts it if asked, and sends the new-device alert once. */
export async function finishSecondStep(trust: boolean) {
  const { user } = await signedInUser();
  if (!user) throw new Error("Not signed in");
  const session = await deviceSession(user.id);
  const db = supabaseAdmin();
  const patch: Record<string, string> = {};
  if (trust) patch.trusted_until = new Date(Date.now() + TRUST_DAYS * 86_400_000).toISOString();
  const isNewDevice = !session.alerted_at;
  if (isNewDevice) patch.alerted_at = new Date().toISOString();
  if (Object.keys(patch).length) await db.from("sessions").update(patch).eq("id", session.id);
  await markStepDone(user.id, session.id);
  // A brand-new account's first device isn't "someone else"; alert from the second device on.
  const { count } = await db.from("sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if (isNewDevice && (count ?? 0) > 1 && user.email) {
    await sendEmail(
      signInAlertEmail(user.email, {
        device: session.device ?? "Unknown device",
        browser: session.browser ?? "Browser",
        city: session.city,
        country: session.country,
        ip: session.ip,
        at: new Date(),
      }),
    );
  }
}

/** For pages behind sign-in: the user, or null when the second step isn't done on this device. */
export async function verifiedUser() {
  const { supabase, user } = await signedInUser();
  if (!user) return null;
  const sid = await stepSessionId(user.id);
  if (!sid) return null;
  const { data } = await supabaseAdmin().from("sessions").select("id, revoked_at").eq("id", sid).maybeSingle();
  if (!data || data.revoked_at) return null;
  return { supabase, user, sessionId: sid };
}

/** Masks an email the way 62a shows it: mi•••••@studio.co */
export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}•••••@${domain}`;
}
