import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { env } from "../env";
import { STEP_COOKIE, readStep as readStepToken, signStep } from "./step-token";

/*
 * Devices and the "second step done" marker.
 * - depod_device: a random id for this browser (1 year). Stored hashed in public.sessions.
 * - depod_step:   signed proof that this user finished the second step on this device.
 */
export const DEVICE_COOKIE = "depod_device";
export { STEP_COOKIE };
const YEAR = 60 * 60 * 24 * 365;

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const sign = (s: string) => signStep(s, env("DEPOD_SECRET"));

const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

/** This browser's device id, created on first use. */
export async function deviceToken(): Promise<string> {
  const store = await cookies();
  let token = store.get(DEVICE_COOKIE)?.value;
  if (!token) {
    token = randomBytes(32).toString("base64url");
    store.set(DEVICE_COOKIE, token, { ...cookieOpts, maxAge: YEAR });
  }
  return token;
}

/** Marks the second step as done for this user on this device. */
export async function markStepDone(userId: string, sessionId: string) {
  const payload = `${userId}.${sessionId}`;
  (await cookies()).set(STEP_COOKIE, `${payload}.${sign(payload)}`, cookieOpts);
}

export async function clearStep() {
  (await cookies()).delete(STEP_COOKIE);
}

/** Returns the device session id if this user finished the second step on this device. */
export async function stepSessionId(userId: string): Promise<string | null> {
  return readStepToken((await cookies()).get(STEP_COOKIE)?.value, userId, env("DEPOD_SECRET"));
}

/** What we show on the Security page and in sign-in alerts: device, browser, approximate place, IP. */
export async function requestDetails() {
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const city = h.get("x-vercel-ip-city");
  const country = h.get("x-vercel-ip-country");
  return {
    browser: parseBrowser(ua),
    device: parseOs(ua),
    ip,
    city: city ? decodeURIComponent(city) : null,
    country: country ?? null,
  };
}

function parseBrowser(ua: string) {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "Browser";
}

function parseOs(ua: string) {
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown device";
}
