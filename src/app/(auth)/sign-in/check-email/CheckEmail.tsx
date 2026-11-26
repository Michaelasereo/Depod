"use client";

import { useActionState } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import { resendSignInLink } from "../../actions";

export function CheckEmailActions({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendSignInLink, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="email" value={email} />
      <div className="flex gap-2">
        <Button htmlType="submit" variant="secondary" disabled={pending}>
          Resend link
        </Button>
        <LinkButton href="/sign-in" variant="ghost">
          Use another email
        </LinkButton>
      </div>
      {state?.sent && <p className="text-caption-12 text-text-secondary">Sent again. Check your inbox.</p>}
      {state?.error && <p className="text-caption-12 text-text-danger">{state.error}</p>}
    </form>
  );
}
