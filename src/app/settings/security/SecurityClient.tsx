"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/display";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/controls";
import { Modal } from "@/components/ui/overlays";
import { CodeInput } from "@/components/auth/CodeInput";
import { confirmAuthenticator, removeAuthenticator, renewRecoveryCodes, signOutDevice, startAuthenticator } from "./actions";

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      {children}
    </div>
  );
}

const Err = ({ children }: { children?: string }) => (children ? <p className="text-caption-12 text-text-danger">{children}</p> : null);

/* 63c Recovery codes: Copy, Download, Done. */
function RecoveryCodes({ codes, step, onDone }: { codes: string[]; step?: boolean; onDone: () => void }) {
  const text = codes.join("\n");
  const [copied, setCopied] = useState(false);
  return (
    <Overlay onClose={onDone}>
      <Modal
        title="Save your recovery codes"
        body={`${step ? "Step 3 of 3. " : ""}Each code works once. Keep them somewhere safe, like a password manager.`}
        primaryLabel="Done"
        onPrimary={onDone}
        onClose={onDone}
      >
        <ul className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl bg-bg-subtle p-3 font-mono text-label-13 text-text-primary">
          {codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            leadingIcon="copy"
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            variant="secondary"
            leadingIcon="download"
            onClick={() => {
              const a = document.createElement("a");
              a.href = URL.createObjectURL(new Blob([`Depod recovery codes\n\n${text}\n`], { type: "text/plain" }));
              a.download = "depod-recovery-codes.txt";
              a.click();
            }}
          >
            Download
          </Button>
        </div>
      </Modal>
    </Overlay>
  );
}

type Setup = { factorId: string; qr: string; secret: string };

/* 61a/61b row, with 63a–63d. */
export function AuthenticatorRow({ on, detail }: { on: boolean; detail?: string }) {
  const [pending, start] = useTransition();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [stepTwo, setStepTwo] = useState(false);
  const [codes, setCodes] = useState<{ list: string[]; step: boolean } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string>();

  const begin = () =>
    start(async () => {
      setError(undefined);
      const res = await startAuthenticator();
      if ("error" in res) return setError(res.error);
      setSetup(res);
      setStepTwo(false);
    });

  const close = () => {
    setSetup(null);
    setStepTwo(false);
    setError(undefined);
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border-default bg-bg-surface px-5 py-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-label-13 text-text-primary">Authenticator app</span>
        <span className="text-body-15 text-text-secondary">{on ? detail : "Use an app like Google Authenticator or 1Password instead of email codes."}</span>
      </div>
      {on ? (
        <div className="flex items-center gap-2">
          <Badge type="success">On</Badge>
          <Button variant="secondary" size="small" disabled={pending} onClick={() => start(async () => setCodes({ list: (await renewRecoveryCodes()).codes, step: false }))}>
            Recovery codes
          </Button>
          <Button variant="ghost" size="small" onClick={() => setRemoving(true)}>
            Remove
          </Button>
        </div>
      ) : (
        <Button variant="secondary" size="small" disabled={pending} onClick={begin}>
          Set up
        </Button>
      )}

      {setup && !stepTwo && (
        <Overlay onClose={close}>
          <Modal title="Set up an authenticator app" body="Step 1 of 3. Scan this QR code with your authenticator app." secondaryLabel="Cancel" onSecondary={close} primaryLabel="Next" onPrimary={() => setStepTwo(true)} onClose={close}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qr} alt="QR code for your authenticator app" className="size-40 rounded-xl border border-border-default bg-white p-2" />
            <div className="flex items-center justify-between gap-3 rounded-xl bg-bg-subtle px-3 py-2">
              <div className="flex flex-col">
                <span className="text-caption-12 text-text-secondary">Can&apos;t scan? Enter this key:</span>
                <span className="font-mono text-label-13 text-text-primary">{setup.secret.replace(/(.{4})/g, "$1 ").trim()}</span>
              </div>
              <Button variant="ghost" size="small" leadingIcon="copy" onClick={() => navigator.clipboard.writeText(setup.secret)}>
                Copy
              </Button>
            </div>
          </Modal>
        </Overlay>
      )}

      {setup && stepTwo && (
        <Overlay onClose={close}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const code = String(new FormData(e.currentTarget).get("code") ?? "");
              start(async () => {
                const res = await confirmAuthenticator(setup.factorId, code);
                if ("error" in res) return setError(res.error);
                close();
                setCodes({ list: res.codes, step: true });
              });
            }}
          >
            <Modal title="Set up an authenticator app" body="Step 2 of 3. Enter the 6-digit code from your app." secondaryLabel="Back" onSecondary={() => setStepTwo(false)} primaryLabel={pending ? "Turning on…" : "Turn on"} primaryType="submit" onClose={close}>
              <CodeInput error={!!error} />
              <Err>{error}</Err>
            </Modal>
          </form>
        </Overlay>
      )}

      {codes && <RecoveryCodes codes={codes.list} step={codes.step} onDone={() => setCodes(null)} />}

      {removing && (
        <Overlay onClose={() => setRemoving(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const value = String(new FormData(e.currentTarget).get("value") ?? "").trim();
              start(async () => {
                const res = await removeAuthenticator(/^\d{6}$/.test(value) ? { code: value } : { recovery: value });
                if ("error" in res) return setError(res.error);
                setRemoving(false);
                setError(undefined);
              });
            }}
          >
            <Modal
              title="Remove the authenticator app?"
              body="Sign-in goes back to email codes. Enter a code from your app, or a recovery code, to confirm."
              secondaryLabel="Cancel"
              onSecondary={() => setRemoving(false)}
              primaryLabel="Remove"
              primaryVariant="danger"
              primaryType="submit"
              onClose={() => setRemoving(false)}
            >
              <Input name="value" placeholder="123456 or XXXX-XXXX" aria-label="Code" autoComplete="off" autoFocus error={!!error} />
              <Err>{error}</Err>
            </Modal>
          </form>
        </Overlay>
      )}
      {error && !setup && !removing && <Err>{error}</Err>}
    </div>
  );
}

export function DeviceSignOut({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="ghost" size="small" disabled={pending} onClick={() => start(() => signOutDevice(id))}>
      Sign out
    </Button>
  );
}

export function SignOutOthers() {
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" leadingIcon="logout" className="self-end" disabled={pending} onClick={() => start(() => signOutDevice("others"))}>
      Sign out of all other devices
    </Button>
  );
}
