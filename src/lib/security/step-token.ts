import { createHmac, timingSafeEqual } from "node:crypto";

/* Pure helpers for the signed "second step done" cookie, safe to use in the proxy. */
export const STEP_COOKIE = "depod_step";

export const signStep = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("base64url");

/** Returns the device session id if the cookie proves this user finished the second step. */
export function readStep(value: string | undefined, userId: string, secret: string): string | null {
  if (!value) return null;
  const [uid, sid, sig] = value.split(".");
  if (!uid || !sid || !sig || uid !== userId) return null;
  const want = Buffer.from(signStep(`${uid}.${sid}`, secret));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got) ? sid : null;
}
