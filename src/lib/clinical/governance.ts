import { createBrowserClient } from "@/lib/supabase/browser";

export async function recordClinicalAudit(action: string, entity: string, entityId: string, metadata: Record<string, unknown> = {}) {
  const client = createBrowserClient(); if (!client) return;
  const { data: { user } } = await client.auth.getUser(); if (!user) return;
  await client.schema("operations").from("audit_log").insert({ actor_id: user.id, action, entity, entity_id: entityId, metadata });
}

export function calculateAreaChange(previousArea: number | null | undefined, currentArea: number | null | undefined) {
  if (!previousArea || currentArea === null || currentArea === undefined) return null;
  return Number((((previousArea - currentArea) / previousArea) * 100).toFixed(2));
}

export function canConfirmAssessment(role: string | null | undefined) { return role === "physician" || role === "super_admin"; }
export function canMarkWoundHealed(role: string | null | undefined) { return role === "physician" || role === "super_admin"; }
export function isClinicalDraft(status: string) { return status === "draft" || status === "returned"; }
