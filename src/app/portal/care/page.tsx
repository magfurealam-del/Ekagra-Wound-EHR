import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function PortalCare() {
  const client = await createServerSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/portal");
  const { data: link, error: linkError } = await client.schema("identity").from("patient_portal_users").select("patient_id, patients(full_name, registration_no)").eq("user_id", user.id).eq("status", "active").maybeSingle();
  const patient = Array.isArray(link?.patients) ? link.patients[0] : link?.patients;
  const { data: assessments, error: assessmentError } = link?.patient_id ? await client.schema("clinical").from("wound_assessments").select("id, wound_id, length_cm, width_cm, depth_cm, area_cm2, created_at, wounds(wound_type, site)").eq("status", "physician_confirmed").order("created_at", { ascending: false }) : { data: null, error: null };
  const message = linkError?.message ?? assessmentError?.message;
  return <main className="portal-page"><div className="portal-card"><p className="eyebrow">Patient portal</p><h1>Confirmed care</h1><p>Your portal session is active for {user.phone ?? "your account"}.</p>{message && <p className="login-error">{message}</p>}{!message && !patient && <section className="panel"><h2>Link pending</h2><p>Your phone account is authenticated, but a clinic has not linked it to a patient record yet.</p></section>}{patient && <><section className="panel"><h2>{patient.full_name}</h2><p>Registration: {patient.registration_no ?? "Pending"}</p><span className="badge">Read-only access</span></section><section className="panel"><h2>Confirmed wound progress</h2>{!assessments?.length && <p>No confirmed assessments are available yet.</p>}{assessments?.map((assessment) => { const wound = Array.isArray(assessment.wounds) ? assessment.wounds[0] : assessment.wounds; return <article key={assessment.id} className="patient-row"><div className="patient-name">{wound?.wound_type ?? "Wound assessment"}<small>{wound?.site ?? "Site not recorded"}</small></div><span>{assessment.length_cm} × {assessment.width_cm} × {assessment.depth_cm} cm</span><span>{assessment.area_cm2 ?? "—"} cm²</span><span>{new Date(assessment.created_at).toLocaleDateString()}</span></article>; })}</section></>}<Link className="text-link" href="/">Return to Ekagra</Link></div></main>;
}
