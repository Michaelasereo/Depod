import { NextResponse, type NextRequest } from "next/server";
import { AFTER_SIGN_IN, startSecondStep } from "@/lib/security/flow";

/* Decides the second step for this device and sends the email code when one is needed. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const raw = url.searchParams.get("next") ?? "";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : AFTER_SIGN_IN;
  try {
    const step = await startSecondStep();
    const to = step === "done" ? next : step === "email" ? `/verify?next=${encodeURIComponent(next)}` : `/verify/authenticator?next=${encodeURIComponent(next)}`;
    return NextResponse.redirect(new URL(to, url.origin));
  } catch {
    return NextResponse.redirect(new URL("/sign-in", url.origin));
  }
}
