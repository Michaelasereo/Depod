"use client";

import { useState } from "react";
import { Icon } from "../icon/Icon";
import { Button } from "../ui/Button";
import { Toggle } from "../ui/controls";
import { Modal } from "../ui/overlays";
import { Scrim } from "./dialogs";
import type { ShareApi, ShareState } from "./types";

/*
 * Figma 16 Share, the link section only (people and roles come with Teams).
 * Turning the link off revokes it; turning it on again makes a new one, so an old link never comes back.
 */
export function ShareDialog({
  name,
  state,
  api,
  canEdit,
  onChange,
  onClose,
}: {
  name: string;
  state: ShareState;
  api: ShareApi;
  canEdit: boolean;
  onChange: (s: ShareState) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();

  const toggle = async (on: boolean) => {
    setBusy(true);
    setError(undefined);
    try {
      onChange(await api.setEnabled(on));
    } catch {
      setError(on ? "Couldn't turn the link on. Try again." : "Couldn't turn the link off. Try again.");
    }
    setBusy(false);
  };

  const copy = async () => {
    if (!state.url) return;
    try {
      await navigator.clipboard.writeText(state.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Select the link and copy it yourself.");
    }
  };

  return (
    <Scrim onClose={onClose}>
      <Modal title={`Share ${name}`} primaryLabel="Done" onPrimary={onClose} onClose={onClose}>
        <div className="flex items-center gap-3">
          <Icon name="link" className="text-icon-secondary" />
          <span className="flex-1 text-label-13 text-text-primary">Anyone with the link can view</span>
          <Toggle checked={state.enabled} disabled={!canEdit || busy} onChange={toggle} label="Anyone with the link can view" />
        </div>
        {state.enabled && state.url && (
          <Button variant="secondary" leadingIcon={copied ? "check" : "copy"} fullWidth onClick={copy}>
            {copied ? "Link copied" : "Copy link"}
          </Button>
        )}
        {error && <p className="text-caption-12 text-text-danger">{error}</p>}
      </Modal>
    </Scrim>
  );
}
