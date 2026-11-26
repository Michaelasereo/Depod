import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { env } from "../env";
import { supabaseAdmin } from "../supabase/admin";

/*
 * Email codes and recovery codes. PRD security defaults:
 * - 6-digit email code, expires in 10 minutes.
 * - 5 wrong codes lock the attempt for 15 minutes.
 * - 10 recovery codes, each works once.
 */
const CODE_TTL_MIN = 10;
const MAX_FAILURES = 5;
const LOCK_MIN = 15;

const hash = (code: string) => createHmac("sha256", env("DEPOD_SECRET")).update(code.replace(/[\s-]/g, "").toUpperCase()).digest("hex");
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export type CodeResult = { ok: true } | { ok: false; reason: "wrong" | "expired" | "locked"; lockedUntil?: string };

export async function lockedUntil(userId: string): Promise<Date | null> {
  const { data } = await supabaseAdmin().from("code_lockouts").select("locked_until").eq("user_id", userId).maybeSingle();
  const until = data?.locked_until ? new Date(data.locked_until) : null;
  return until && until > new Date() ? until : null;
}

/** Counts a wrong code; the fifth locks the attempt for 15 minutes. */
export async function recordFailure(userId: string): Promise<Date | null> {
  const db = supabaseAdmin();
  const { data } = await db.from("code_lockouts").select("failures").eq("user_id", userId).maybeSingle();
  const failures = (data?.failures ?? 0) + 1;
  const until = failures >= MAX_FAILURES ? new Date(Date.now() + LOCK_MIN * 60_000) : null;
  await db.from("code_lockouts").upsert({
    user_id: userId,
    failures: until ? 0 : failures,
    locked_until: until?.toISOString() ?? null,
  });
  return until;
}

export async function clearFailures(userId: string) {
  await supabaseAdmin().from("code_lockouts").delete().eq("user_id", userId);
}

/** Creates a new email code (older ones stop working) and returns it for sending. */
export async function issueEmailCode(userId: string): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const db = supabaseAdmin();
  await db.from("email_codes").update({ used_at: new Date().toISOString() }).eq("user_id", userId).is("used_at", null);
  await db.from("email_codes").insert({
    user_id: userId,
    code_hash: hash(code),
    expires_at: new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString(),
  });
  return code;
}

export async function verifyEmailCode(userId: string, code: string): Promise<CodeResult> {
  const locked = await lockedUntil(userId);
  if (locked) return { ok: false, reason: "locked", lockedUntil: locked.toISOString() };
  const db = supabaseAdmin();
  const { data } = await db
    .from("email_codes")
    .select("id, code_hash, expires_at")
    .eq("user_id", userId)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return { ok: false, reason: "expired" };
  if (new Date(data.expires_at) < new Date()) return { ok: false, reason: "expired" };
  if (!same(data.code_hash, hash(code))) {
    const until = await recordFailure(userId);
    return until ? { ok: false, reason: "locked", lockedUntil: until.toISOString() } : { ok: false, reason: "wrong" };
  }
  await db.from("email_codes").update({ used_at: new Date().toISOString() }).eq("id", data.id);
  await clearFailures(userId);
  return { ok: true };
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I
const group = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

/** Replaces the user's recovery codes with 10 new ones and returns them once, to show. */
export async function newRecoveryCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: 10 }, () => `${group()}-${group()}`);
  const db = supabaseAdmin();
  await db.from("recovery_codes").delete().eq("user_id", userId);
  await db.from("recovery_codes").insert(codes.map((c) => ({ user_id: userId, code_hash: hash(c) })));
  return codes;
}

export async function recoveryCodesLeft(userId: string): Promise<number> {
  const { count } = await supabaseAdmin()
    .from("recovery_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("used_at", null);
  return count ?? 0;
}

export async function redeemRecoveryCode(userId: string, code: string): Promise<CodeResult> {
  const locked = await lockedUntil(userId);
  if (locked) return { ok: false, reason: "locked", lockedUntil: locked.toISOString() };
  const db = supabaseAdmin();
  const { data } = await db.from("recovery_codes").select("id").eq("user_id", userId).eq("code_hash", hash(code)).is("used_at", null).maybeSingle();
  if (!data) {
    const until = await recordFailure(userId);
    return until ? { ok: false, reason: "locked", lockedUntil: until.toISOString() } : { ok: false, reason: "wrong" };
  }
  await db.from("recovery_codes").update({ used_at: new Date().toISOString() }).eq("id", data.id);
  await clearFailures(userId);
  return { ok: true };
}
