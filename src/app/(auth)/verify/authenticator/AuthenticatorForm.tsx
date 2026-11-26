"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input } from "@/components/ui/controls";
import { CodeInput } from "@/components/auth/CodeInput";
import { verifyAuthenticator } from "../../actions";

/* Figma 62b Authenticator code at sign-in, with "Use a recovery code". */
export function AuthenticatorForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(verifyAuthenticator, undefined);
  const [trust, setTrust] = useState(true);
  const [recovery, setRecovery] = useState(false);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <input type="hidden" name="trust" value={trust ? "on" : ""} />
      <input type="hidden" name="mode" value={recovery ? "recovery" : "app"} />
      {recovery ? (
        <Input name="recovery" placeholder="XXXX-XXXX" aria-label="Recovery code" autoComplete="off" autoFocus error={!!state?.error} />
      ) : (
        <CodeInput error={!!state?.error} />
      )}
      {state?.error && <p className="-mt-2 text-caption-12 text-text-danger">{state.error}</p>}
      <Button htmlType="submit" fullWidth disabled={pending}>
        Verify
      </Button>
      <label className="flex items-center gap-2.5">
        <Checkbox checked={trust} onChange={setTrust} label="Trust this device for 30 days" />
        <span className="text-body-15 text-text-secondary">Trust this device for 30 days</span>
      </label>
      <Button variant="ghost" size="small" className="self-start" onClick={() => setRecovery(!recovery)}>
        {recovery ? "Use the authenticator app" : "Use a recovery code"}
      </Button>
    </form>
  );
}
