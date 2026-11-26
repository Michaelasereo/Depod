"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/controls";
import { CodeInput } from "@/components/auth/CodeInput";
import { resendEmailCode, verifyEmail } from "../actions";

/* Figma 62a Email code at sign-in. */
export function VerifyEmailForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(verifyEmail, undefined);
  const [resend, resendAction, resending] = useActionState(resendEmailCode, undefined);
  const [trust, setTrust] = useState(true);
  return (
    <>
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <input type="hidden" name="trust" value={trust ? "on" : ""} />
        <CodeInput error={!!state?.error} />
        {state?.error && <p className="-mt-2 text-caption-12 text-text-danger">{state.error}</p>}
        <Button htmlType="submit" fullWidth disabled={pending}>
          Verify
        </Button>
        <label className="flex items-center gap-2.5">
          <Checkbox checked={trust} onChange={setTrust} label="Trust this device for 30 days" />
          <span className="text-body-15 text-text-secondary">Trust this device for 30 days</span>
        </label>
      </form>
      <form action={resendAction} className="flex flex-col gap-2">
        <Button htmlType="submit" variant="ghost" size="small" className="self-start" disabled={resending}>
          Resend code
        </Button>
        {resend?.sent && <p className="text-caption-12 text-text-secondary">New code sent. The old one no longer works.</p>}
        {resend?.error && <p className="text-caption-12 text-text-danger">{resend.error}</p>}
      </form>
    </>
  );
}
