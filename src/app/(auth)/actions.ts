"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
import { AFTER_SIGN_IN, finishSecondStep, sendEmailCode } from "@/lib/security/flow";
import { lockedUntil, redeemRecoveryCode, verifyEmailCode, recordFailure, clearFailures } from "@/lib/security/codes";
import { clearStep } from "@/lib/security/device";

export type FormState = { error?: string; sent?: boolean } | undefined;

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : siteUrl();
}

const safeNext = (next: unknown) => (typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : AFTER_SIGN_IN);

export async function signInWithGoogle(formData: FormData) {
  const supabase = await supabaseServer();
  const next = safeNext(formData.get("next"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/sign-in?error=google");
  redirect(data.url);
}

export async function sendSignInLink(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  const next = safeNext(formData.get("next"));
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: true },
  });
  if (error) return { error: error.status === 429 ? "Too many links sent. Wait a minute and try again." : "We couldn't send the link. Try again." };
  redirect(`/sign-in/check-email?email=${encodeURIComponent(email)}`);
}

export async function resendSignInLink(_: FormState, formData: FormData): Promise<FormState> {
  const res = await sendSignInLink(undefined, formData);
  return res ?? { sent: true };
}

const lockMessage = (iso?: string) => {
  const mins = iso ? Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 60_000)) : 15;
  return `Too many wrong codes. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`;
};

export async function verifyEmail(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/sign-in");
  const code = String(formData.get("code") ?? "");
  if (code.length !== 6) return { error: "Enter all 6 digits." };
  const res = await verifyEmailCode(data.user.id, code);
  if (!res.ok) {
    if (res.reason === "locked") return { error: lockMessage(res.lockedUntil) };
    if (res.reason === "expired") return { error: "That code has expired. Send a new one." };
    return { error: "That code isn't right. Check the email and try again." };
  }
  await finishSecondStep(formData.get("trust") === "on");
  redirect(safeNext(formData.get("next")));
}

export async function resendEmailCode(): Promise<FormState> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/sign-in");
  const locked = await lockedUntil(data.user.id);
  if (locked) return { error: lockMessage(locked.toISOString()) };
  await sendEmailCode();
  return { sent: true };
}

export async function verifyAuthenticator(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/sign-in");
  const userId = data.user.id;
  const locked = await lockedUntil(userId);
  if (locked) return { error: lockMessage(locked.toISOString()) };

  if (formData.get("mode") === "recovery") {
    const res = await redeemRecoveryCode(userId, String(formData.get("recovery") ?? ""));
    if (!res.ok) return { error: res.reason === "locked" ? lockMessage(res.lockedUntil) : "That recovery code isn't right, or it's been used." };
  } else {
    const code = String(formData.get("code") ?? "");
    if (code.length !== 6) return { error: "Enter all 6 digits." };
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp.find((f) => f.status === "verified");
    if (!factor) redirect("/auth/continue");
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (error) {
      const until = await recordFailure(userId);
      return { error: until ? lockMessage(until.toISOString()) : "That code isn't right. Check your app and try again." };
    }
    await clearFailures(userId);
  }
  await finishSecondStep(formData.get("trust") === "on");
  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut({ scope: "local" });
  await clearStep();
  redirect("/sign-in");
}
