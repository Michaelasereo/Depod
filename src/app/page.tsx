import { LinkButton } from "@/components/ui/Button";
import { Wordmark } from "@/components/brand/Logo";

// Placeholder until Phase 7 builds the marketing home page. The proxy sends "/" to /home or /sign-in, so this rarely shows.
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <Wordmark className="h-8 w-auto text-text-primary" />
      <p className="max-w-md text-body-15 text-text-secondary">
        A canvas to collect references, build bentos, and choose a direction with your team.
      </p>
      <LinkButton href="/components">See the components</LinkButton>
    </main>
  );
}
