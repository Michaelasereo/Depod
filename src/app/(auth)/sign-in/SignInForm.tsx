"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/controls";
import { sendSignInLink, signInWithGoogle } from "../actions";

export function SignInForm({ next, googleError }: { next?: string; googleError?: boolean }) {
  const [state, action, pending] = useActionState(sendSignInLink, undefined);
  return (
    <>
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next ?? ""} />
        <Button htmlType="submit" variant="secondary" fullWidth>
          Continue with Google
        </Button>
      </form>
      {googleError && <p className="text-caption-12 text-text-danger">Google sign-in didn&apos;t work. Try again, or use your email.</p>}
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border-default" />
        <span className="text-caption-12 text-text-tertiary">or</span>
        <span className="h-px flex-1 bg-border-default" />
      </div>
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Input name="email" type="email" autoComplete="email" placeholder="you@studio.co" aria-label="Email" required error={!!state?.error} />
        {state?.error && <p className="-mt-2 text-caption-12 text-text-danger">{state.error}</p>}
        <Button htmlType="submit" fullWidth disabled={pending}>
          Email me a sign-in link
        </Button>
      </form>
    </>
  );
}
