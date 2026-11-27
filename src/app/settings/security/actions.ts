"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifiedUser } from "@/lib/security/flow";
import { clearFailures, lockedUntil, newRecoveryCodes, recordFailure, redeemRecoveryCode } from "@/lib/security/codes";
import { requestDetails } from "@/lib/security/device";
import { securityChangeEmail, sendEmail } from "@/lib/email/send";

async function me() {
  const v = await verifiedUser();
  if (!v) redirect("/auth/continue");
  return v;
}

async function notify(email: string | undefined, change: Parameters<typeof securityChangeEmail>[1]) {
  if (!email) return;
  const d = await requestDetails();
  await sendEmail(securityChangeEmail(email, change, { device: d.device, browser: d.browser, city: d.city, country: d.country, at: new Date() }));
}

/** 63a: starts authenticator setup and returns the QR code and key. */
export async function startAuthenticator(): Promise<{ factorId: string; qr: string; secret: string } | { error: string }> {
  const { supabase } = await me();
  const { data: list } = await supabase.auth.mfa.listFactors();
  // Clear any half-finished setup first.
  for (const f of list?.all ?? []) if (f.factor_type === "totp" && f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Depod ${Date.now()}` });
  if (error || !data) return { error: "We couldn't start the setup. Try again." };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** 63b → 63c: confirms the first code, turns the app on, and returns 10 recovery codes. */
export async function confirmAuthenticator(factorId: string, code: string): Promise<{ codes: string[] } | { error: string }> {
  const { supabase, user } = await me();
  if (!/^\d{6}$/.test(code)) return { error: "Enter all 6 digits." };
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { error: "That code isn't right. Check your app and try again." };
  const codes = await newRecoveryCodes(user.id);
  await notify(user.email, {
    title: "Authenticator app added",
    subject: "An authenticator app was added to your Depod account",
    sentence: "An authenticator app was added to your account",
    after: "Sign-in now uses codes from the app instead of email codes.",
  });
  revalidatePath("/settings/security");
  return { codes };
}

/** "Recovery codes" in 61b: replaces the codes with a fresh set. */
export async function renewRecoveryCodes(): Promise<{ codes: string[] }> {
  const { user } = await me();
  const codes = await newRecoveryCodes(user.id);
  await notify(user.email, {
    title: "New recovery codes",
    subject: "New recovery codes for your Depod account",
    sentence: "New recovery codes were made for your account",
    after: "The old codes no longer work.",
  });
  revalidatePath("/settings/security");
  return { codes };
}

/** 63d: removing the app needs a current code from it, or a recovery code. */
export async function removeAuthenticator(input: { code?: string; recovery?: string }): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await me();
  const locked = await lockedUntil(user.id);
  if (locked) return { error: "Too many wrong codes. Try again in 15 minutes." };
  const { data: list } = await supabase.auth.mfa.listFactors();
  const factor = list?.totp.find((f) => f.status === "verified");
  if (!factor) return { ok: true };

  if (input.recovery) {
    const res = await redeemRecoveryCode(user.id, input.recovery);
    if (!res.ok) return { error: res.reason === "locked" ? "Too many wrong codes. Try again in 15 minutes." : "That recovery code isn't right, or it's been used." };
  } else {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: input.code ?? "" });
    if (error) {
      const until = await recordFailure(user.id);
      return { error: until ? "Too many wrong codes. Try again in 15 minutes." : "That code isn't right. Check your app and try again." };
    }
    await clearFailures(user.id);
  }

  const admin = supabaseAdmin();
  const { error } = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: user.id });
  if (error) return { error: "We couldn't remove the app. Try again." };
  await admin.from("recovery_codes").delete().eq("user_id", user.id);
  await notify(user.email, {
    title: "Authenticator app removed",
    subject: "The authenticator app was removed from your Depod account",
    sentence: "The authenticator app was removed from your account",
    after: "Sign-in now uses email codes.",
  });
  revalidatePath("/settings/security");
  return { ok: true };
}

/** Signs out one device, or every device except this one. */
export async function signOutDevice(sessionId: string | "others") {
  const { user, sessionId: current } = await me();
  const admin = supabaseAdmin();
  let q = admin.from("sessions").select("id, auth_session_id").eq("user_id", user.id).is("revoked_at", null);
  q = sessionId === "others" ? q.neq("id", current) : q.eq("id", sessionId).neq("id", current);
  const { data: rows } = await q;
  for (const r of rows ?? []) {
    await admin.from("sessions").update({ revoked_at: new Date().toISOString(), trusted_until: null }).eq("id", r.id);
    if (r.auth_session_id) await admin.rpc("revoke_auth_session", { sid: r.auth_session_id });
  }
  revalidatePath("/settings/security");
}
