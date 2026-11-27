import Link from "next/link";
import { Wordmark } from "../brand/Logo";
import { EmptyState } from "../ui/overlays";
import { signOut } from "@/app/(auth)/actions";

/*
 * Figma 24 No access. Also used for a share link that was turned off or never existed.
 * "Request access" comes with Teams, so it isn't shown yet.
 */
export function NoAccess({ email, link }: { email?: string; link?: boolean }) {
  return (
    <div className="min-h-screen bg-bg-canvas">
      <header className="flex h-16 items-center px-8">
        <Link href={email ? "/home" : "/"} aria-label="Depod">
          <Wordmark className="text-text-primary" />
        </Link>
      </header>
      <main className="flex flex-col items-center gap-6 pt-[18vh]">
        <EmptyState
          illustration={link ? "link-broken" : "no-access"}
          title={link ? "This link doesn't work" : "You don't have access"}
          body={link ? "It was turned off, or it was copied wrong. Ask the person who shared it for a new link." : "This is private to its workspace. Ask the owner to let you in."}
        />
        {email && (
          <form action={signOut} className="text-caption-12 text-text-tertiary">
            Signed in as {email} ·{" "}
            <button type="submit" className="underline hover:text-text-secondary">
              Switch account
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
