"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/app/app-shell";
import { createBrowserClient } from "@/lib/supabase/browser";

type Patient = { id: string; full_name: string; registration_no: string | null; sex: string | null };

export default function AppHome() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [counts, setCounts] = useState({ patients: 0, wounds: 0, ipd: 0, referrals: 0 });
  const [name, setName] = useState("Clinical team");
  const [message, setMessage] = useState("Loading live clinic data…");

  useEffect(() => {
    const client = createBrowserClient();
    if (!client) { setMessage("Supabase is not configured."); return; }
    void (async () => {
      const user = await client.auth.getUser();
      if (!user.data.user) { setMessage("Sign in is required."); return; }
      const profile = await client.schema("identity").from("staff_profiles").select("full_name").eq("id", user.data.user.id).maybeSingle();
      const patientQuery = await client.schema("patients").from("records").select("id, full_name, registration_no, sex", { count: "exact" }).order("created_at", { ascending: false }).limit(3);
      const wounds = await client.schema("clinical").from("wounds").select("id", { count: "exact", head: true }).eq("status", "active");
      const ipd = await client.schema("clinical").from("ipd_admissions").select("id", { count: "exact", head: true }).eq("status", "active");
      const referrals = await client.schema("referrals").from("records").select("id", { count: "exact", head: true }).in("status", ["draft", "sent", "accepted"]);
      if (patientQuery.error) { setMessage(patientQuery.error.message); return; }
      setName(profile.data?.full_name ?? "Clinical team");
      setPatients(patientQuery.data ?? []);
      setCounts({ patients: patientQuery.count ?? 0, wounds: wounds.count ?? 0, ipd: ipd.count ?? 0, referrals: referrals.count ?? 0 });
      setMessage("");
    })();
  }, []);

  return <AppShell>
    <div className="page-heading"><div><h1>Good morning, {name}</h1><p>Live clinical picture for your assigned clinic.</p></div><Link className="workspace-button" href="/app/patients/new">+ Register patient</Link></div>
    {message && <p className="login-error">{message}</p>}
    <div className="stat-grid"><div className="stat-card"><small>Accessible patients</small><strong>{counts.patients}</strong><span>Live records</span></div><div className="stat-card"><small>Active wounds</small><strong>{counts.wounds}</strong><span>Across accessible records</span></div><div className="stat-card alert"><small>Active IPD</small><strong>{counts.ipd}</strong><span>Current admissions</span></div><div className="stat-card"><small>Open referrals</small><strong>{counts.referrals}</strong><span>Current episodes</span></div></div>
    <div className="dashboard-grid"><section className="panel"><div className="panel-title"><h2>Recent patients</h2><Link href="/app/patients">View all patients →</Link></div>{!message && !patients.length && <p>No patients are available for this clinic yet.</p>}{patients.map((patient) => <Link className="patient-row" href={`/app/patients/${patient.id}`} key={patient.id}><div className="patient-name">{patient.full_name}<small>{patient.registration_no ?? "Registration pending"}</small></div><span>{patient.sex ?? "Not recorded"}</span><span>Clinical record</span><span style={{ color: "#2b8078", fontWeight: 700 }}>Open →</span></Link>)}</section><section className="panel"><div className="panel-title"><h2>Clinical workspace</h2><Link href="/app/ipd/admissions">IPD board →</Link></div><div className="activity-item"><span className="activity-dot" /><div><p>Use real patient records</p><small>Demo-only patient routes have been removed from the primary workflow.</small></div></div><div className="activity-item"><span className="activity-dot" /><div><p>Review confirmations</p><small>Draft and confirmed assessments remain distinct.</small></div></div></section></div>
    <section className="panel" style={{ marginTop: 15 }}><div className="panel-title"><h2>Quick actions</h2><span style={{ fontSize: 10, color: "#91a7a1" }}>Next clinical action</span></div><div className="quick-grid"><Link className="quick-card" href="/app/patients"><b>＋ Open patient search</b>Find a live patient record</Link><Link className="quick-card" href="/app/patients/new"><b>＋ Register patient</b>Create a new clinical record</Link><Link className="quick-card" href="/app/ipd/admissions"><b>▣ Review IPD board</b>See observations and open admissions</Link><Link className="quick-card" href="/app/referrals"><b>↗ Check referrals</b>Review current handoffs</Link></div></section>
  </AppShell>;
}
