import { createBrowserClient } from "@/lib/supabase/browser";
import { calculateAreaChange } from "@/lib/clinical/governance";

export type AssessmentInput = { patientId: string; woundId: string; lengthCm: number; widthCm: number; depthCm: number; note: string };

export async function getCurrentStaff() {
  const client = createBrowserClient(); if (!client) return { client: null, user: null, profile: null };
  const { data: { user } } = await client.auth.getUser(); if (!user) return { client, user: null, profile: null };
  const { data: profile } = await client.schema("identity").from("staff_profiles").select("id, full_name, role, status").eq("id", user.id).single();
  return { client, user, profile };
}

export async function getLatestConfirmedAssessment(woundId: string, excludeId?: string) {
  const client = createBrowserClient(); if (!client) return null;
  let query = client.schema("clinical").from("wound_assessments").select("id, area_cm2, length_cm, width_cm, depth_cm, created_at").eq("wound_id", woundId).eq("status", "physician_confirmed").order("created_at", { ascending: false }).limit(1);
  if (excludeId) query = query.neq("id", excludeId);
  const { data } = await query.maybeSingle(); return data;
}

export async function createDraftAssessment(input: AssessmentInput) {
  const { client, user, profile } = await getCurrentStaff(); if (!client || !user) return { data: null, error: "Sign in is required." }; if (!profile || profile.status !== "active") return { data: null, error: "Active staff membership is required." };
  const { data: visit } = await client.schema("clinical").from("opd_visits").select("id").eq("patient_id", input.patientId).order("visit_started_at", { ascending: false }).limit(1).maybeSingle(); if (!visit) return { data: null, error: "Create an OPD visit before recording an assessment." };
  const previous = await getLatestConfirmedAssessment(input.woundId);
  const area = input.lengthCm * input.widthCm;
  const { data, error } = await client.schema("clinical").from("wound_assessments").insert({ wound_id: input.woundId, opd_visit_id: visit.id, previous_confirmed_assessment_id: previous?.id ?? null, length_cm: input.lengthCm, width_cm: input.widthCm, depth_cm: input.depthCm, area_change_percent: calculateAreaChange(previous?.area_cm2, area), payload: { note: input.note }, created_by: user.id, status: "draft" }).select("id").single();
  return { data, error: error?.message ?? null };
}

export async function getWoundTimeline(woundId: string) {
  const client = createBrowserClient(); if (!client) return { data: [], error: "Supabase is not configured." };
  return client.schema("clinical").from("wound_assessments").select("id, length_cm, width_cm, depth_cm, area_cm2, area_change_percent, status, previous_confirmed_assessment_id, created_at").eq("wound_id", woundId).order("created_at", { ascending: false });
}
