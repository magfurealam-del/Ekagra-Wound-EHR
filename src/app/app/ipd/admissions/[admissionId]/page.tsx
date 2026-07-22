"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/app/app-shell";
import { createBrowserClient } from "@/lib/supabase/browser";

type Admission = { id: string; patient_id: string; location: string | null; admitted_at: string; status: string };
type Patient = { full_name: string; registration_no: string | null; sex: string | null; dob: string | null };
type DailyLog = { id: string; log_date: string; is_partial: boolean; nurse_payload: Record<string, unknown>; medical_officer_payload: Record<string, unknown>; consultant_payload: Record<string, unknown>; status: string };

function dhakaDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date()); }

export default function AdmissionDetail() {
  const { admissionId } = useParams<{ admissionId: string }>();
  const [admission, setAdmission] = useState<Admission | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [section, setSection] = useState("nurse");
  const [frequency, setFrequency] = useState("once_daily");
  const [note, setNote] = useState("");
  const [pulse, setPulse] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [spo2, setSpo2] = useState("");
  const [temperature, setTemperature] = useState("");
  const [message, setMessage] = useState("Loading admission chart…");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const client = createBrowserClient();
    if (!client) { setMessage("Supabase is not configured."); return; }
    void (async () => {
      const result = await client.schema("clinical").from("ipd_admissions").select("id, patient_id, location, admitted_at, status").eq("id", admissionId).single();
      if (result.error || !result.data) { setMessage(result.error?.message ?? "Admission not found."); return; }
      const patientResult = await client.schema("patients").from("records").select("full_name, registration_no, sex, dob").eq("id", result.data.patient_id).single();
      const logResult = await client.schema("clinical").from("ipd_daily_logs").select("id, log_date, is_partial, nurse_payload, medical_officer_payload, consultant_payload, status").eq("admission_id", admissionId).eq("log_date", dhakaDate()).maybeSingle();
      if (patientResult.error) { setMessage(patientResult.error.message); return; }
      setAdmission(result.data); setPatient(patientResult.data); setDailyLog(logResult.data ?? null); setMessage("");
    })();
  }, [admissionId]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    const client = createBrowserClient();
    if (!client) { setMessage("Supabase is not configured."); setSaving(false); return; }
    const column = section === "nurse" ? "nurse_payload" : section === "medical_officer" ? "medical_officer_payload" : "consultant_payload";
    const payload = section === "nurse"
      ? { observations: { pulse, blood_pressure: bloodPressure, spo2, temperature }, nursing_note: note }
      : section === "medical_officer"
        ? { complaints: note, assessment: note, plan: "Pending consultant review" }
        : { diagnosis: note, plan: "Consultant plan pending" };
    let logId = dailyLog?.id;
    if (!logId) {
      const created = await client.schema("clinical").from("ipd_daily_logs").insert({ admission_id: admissionId, log_date: dhakaDate(), is_partial: false, [column]: payload }).select("id, log_date, is_partial, nurse_payload, medical_officer_payload, consultant_payload, status").single();
      if (created.error || !created.data) { setMessage(created.error?.message ?? "Daily log could not be created."); setSaving(false); return; }
      logId = created.data.id; setDailyLog(created.data);
    } else {
      const update = await client.schema("clinical").from("ipd_daily_logs").update({ [column]: payload }).eq("id", logId).select("id, log_date, is_partial, nurse_payload, medical_officer_payload, consultant_payload, status").single();
      if (update.error || !update.data) { setMessage(update.error?.message ?? "Daily log could not be updated."); setSaving(false); return; }
      setDailyLog(update.data);
    }
    const schedule = await client.schema("clinical").from("ipd_entry_schedules").insert({ daily_log_id: logId, section, frequency, status: "pending" });
    setMessage(schedule.error?.message ?? "Daily entry saved. This remains open until the appropriate clinician signs it.");
    setSaving(false);
  }

  return <AppShell active="IPD admissions">
    <div className="page-heading"><div><p className="eyebrow">IPD clinical chart</p><h1>{patient?.full_name ?? "Admission chart"}</h1><p>{patient?.registration_no ?? "Registration pending"} · {admission?.location ?? "Location not recorded"}</p></div><Link className="text-link" href="/app/ipd/admissions">← Back to admissions</Link></div>
    {message && <p className="login-error">{message}</p>}
    {admission && <>
      <div className="stat-grid"><div className="stat-card"><small>Admission</small><strong style={{ fontSize: 20 }}>{new Date(admission.admitted_at).toLocaleDateString()}</strong><span>{admission.status}</span></div><div className="stat-card"><small>Ward / bed</small><strong style={{ fontSize: 20 }}>{admission.location ?? "—"}</strong><span>Current location</span></div><div className="stat-card"><small>Clinical date</small><strong style={{ fontSize: 20 }}>{dhakaDate()}</strong><span>Asia/Dhaka</span></div><div className="stat-card"><small>Daily chart</small><strong style={{ fontSize: 20 }}>{dailyLog?.status ?? "Not started"}</strong><span>{dailyLog?.is_partial ? "Partial first-day log" : "One log per day"}</span></div></div>
      <form className="panel form-panel" onSubmit={submit}><p className="eyebrow">Daily progress / nursing entry</p><p className="carry-forward"><strong>What this captures</strong><span>Role-specific observations, complaints, assessment, plan, monitoring frequency and an auditable daily-log entry.</span></p><div className="form-grid"><label>Section<select value={section} onChange={(event) => setSection(event.target.value)}><option value="nurse">Nurse observations and nursing note</option><option value="medical_officer">Medical officer complaints, assessment and plan</option><option value="consultant">Consultant diagnosis and plan</option></select></label><label>Monitoring frequency<select value={frequency} onChange={(event) => setFrequency(event.target.value)}><option value="once_daily">Once daily</option><option value="twice_daily">Twice daily</option><option value="every_4_hours">Every 4 hours</option><option value="hourly">Hourly</option></select></label>{section === "nurse" && <><label>Pulse<input inputMode="numeric" value={pulse} onChange={(event) => setPulse(event.target.value)} placeholder="beats/min" /></label><label>Blood pressure<input value={bloodPressure} onChange={(event) => setBloodPressure(event.target.value)} placeholder="systolic/diastolic" /></label><label>SpO₂<input inputMode="numeric" value={spo2} onChange={(event) => setSpo2(event.target.value)} placeholder="percent" /></label><label>Temperature<input inputMode="decimal" value={temperature} onChange={(event) => setTemperature(event.target.value)} placeholder="°C" /></label></>}<label>{section === "nurse" ? "Nursing note" : section === "medical_officer" ? "Complaints / assessment" : "Diagnosis / consultant plan"}<textarea required value={note} onChange={(event) => setNote(event.target.value)} placeholder="Clinical entry" /></label></div>{message && <p>{message}</p>}<button className="workspace-button" disabled={saving}>{saving ? "Saving…" : "Save daily entry →"}</button></form>
      <section className="panel" style={{ marginTop: 15 }}><div className="panel-title"><h2>Next IPD sections</h2><span className="badge">To be built</span></div><div className="quick-grid"><div className="quick-card"><b>Admission and safety screen</b>History, examination, risk category, monitoring frequency and escalation plan.</div><div className="quick-card"><b>Medication and treatment sheet</b>Orders, infusions, once-only drugs, administrations and signatures.</div><div className="quick-card"><b>Intake / output</b>Hourly feeds, IV fluids, urine, stool, suction, shift totals and balance.</div><div className="quick-card"><b>Discharge summary</b>Diagnosis, condition, medication reconciliation, wound state and follow-up.</div></div></section>
    </>}
  </AppShell>;
}
