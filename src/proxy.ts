import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { STEP_COOKIE, readStep } from "@/lib/security/step-token";

/*
 * Keeps the Supabase session fresh and guards signed-in pages.
 * Signed-in pages need both a Supabase session and the second step on this device.
 * Pages still check again on the server (verifiedUser); this is the fast, optimistic check.
 */
const PROTECTED = ["/settings", "/home", "/projects", "/shared", "/m/", "/p/"];
const SECOND_STEP = ["/verify"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const path = request.nextUrl.pathname;

  const redirect = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = "";
    if (to === "/sign-in" && path !== "/") url.searchParams.set("next", path);
    const r = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  const needsAuth = PROTECTED.some((p) => path.startsWith(p));
  const isStep = SECOND_STEP.some((p) => path.startsWith(p));
  if (!user && (needsAuth || isStep)) return redirect("/sign-in");
  if (user && needsAuth && !readStep(request.cookies.get(STEP_COOKIE)?.value, user.id, process.env.DEPOD_SECRET ?? "")) {
    return redirect("/auth/continue");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
