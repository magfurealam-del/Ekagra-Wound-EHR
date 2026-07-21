import { createBrowserClient } from "@/lib/supabase/browser";
import { CLINICAL_DRAFT_VERSION } from "@/lib/clinical/validation";

export type OpdDraftPayload = { woundType: string; location: string; dimensions: { length: string; width: string; depth: string }; photos: string[] };

export async function saveAuthenticatedOpdDraft(payload: OpdDraftPayload) {
  const client = createBrowserClient();
  if (!client) return { ok: false, message: "Supabase environment variables are not configured." };
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return { ok: false, message: "Sign in is required before saving a clinical draft." };
  const drafts = client.schema("clinical").from("form_drafts");
  const existing = await drafts.select("id").eq("user_id", user.id).eq("form_type", "opd_wound_assessment").is("entity_id", null).maybeSingle();
  const versionedPayload = { schemaVersion: CLINICAL_DRAFT_VERSION, ...payload };
  const result = existing.data ? await drafts.update({ payload: versionedPayload, saved_at: new Date().toISOString() }).eq("id", existing.data.id) : await drafts.insert({ user_id: user.id, form_type: "opd_wound_assessment", entity_id: null, payload: versionedPayload });
  const error = existing.error ?? result.error;
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Draft saved to the clinical workspace." };
}

export async function loadAuthenticatedOpdDraft() {
  const client = createBrowserClient(); if (!client) return null;
  const { data: { user } } = await client.auth.getUser(); if (!user) return null;
  const { data } = await client.schema("clinical").from("form_drafts").select("payload, saved_at").eq("user_id", user.id).eq("form_type", "opd_wound_assessment").is("entity_id", null).order("saved_at", { ascending: false }).limit(1).maybeSingle();
  return data;
}
