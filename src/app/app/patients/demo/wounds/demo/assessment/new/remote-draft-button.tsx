"use client";
import { useState } from "react";
import { saveAuthenticatedOpdDraft } from "@/lib/clinical/persistence";

export function RemoteDraftButton({ disabled }: { disabled: boolean }) {
  const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true); const raw = window.localStorage.getItem("ekagra-opd-demo-draft");
    if (!raw) { setMessage("Complete the draft before saving."); setSaving(false); return; }
    try { const draft = JSON.parse(raw); setMessage((await saveAuthenticatedOpdDraft({ woundType: draft.type, location: draft.location, dimensions: draft.dimensions, photos: draft.photos ?? [] })).message); } catch { setMessage("The local draft could not be read."); }
    setSaving(false);
  }
  return <div style={{ marginTop: 10 }}><button className="secondary-button" disabled={disabled || saving} onClick={save}>{saving ? "Saving to workspace…" : "Save authenticated workspace draft"}</button>{message && <small style={{ marginLeft: 10 }}>{message}</small>}</div>;
}
