"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/app/app-shell";
import { createBrowserClient } from "@/lib/supabase/browser";

type AdmissionRow = {
  id: string;
  patient_id: string;
  location: string | null;
  admitted_at: string;
  patients: { full_name: string; registration_no: string | null } | null;
};

export default function Admissions() {
  const [rows, setRows] = useState<AdmissionRow[]>([]);
  const [message, setMessage] = useState("Loading admissions…");

  useEffect(() => {
    const client = createBrowserClient();
    if (!client) { setMessage("Supabase is not configured."); return; }
    void (async () => {
      const admissions = await client.schema("clinical").from("ipd_admissions").select("id, patient_id, location, admitted_at").eq("status", "active").order("admitted_at", { ascending: false });
      if (admissions.error) { setMessage(admissions.error.message); return; }
      const patientIds = (admissions.data ?? []).map((row) => row.patient_id);
      const patients = patientIds.length ? await client.schema("patients").from("records").select("id, full_name, registration_no").in("id", patientIds) : { data: [], error: null };
      if (patients.error) { setMessage(patients.error.message); return; }
      const patientById = new Map((patients.data ?? []).map((patient) => [patient.id, patient]));
      setRows((admissions.data ?? []).map((row) => ({ ...row, patients: patientById.get(row.patient_id) ?? null })));
      setMessage("");
    })();
  }, []);

  return <AppShell active="IPD admissions">
    <div className="page-heading"><div><h1>IPD admissions</h1><p>Monitor active inpatient episodes across the unit.</p></div><Link className="workspace-button" href="/app/ipd/admissions/new">+ New admission</Link></div>
    <div className="panel"><div className="panel-title"><h2>Active board</h2><span className="badge">{rows.length} patients</span></div>
      {message && <p>{message}</p>}
      {!message && !rows.length && <p>No active admissions.</p>}
      {rows.map((row) => <Link className="patient-row" href={`/app/ipd/admissions/${row.id}`} key={row.id}><div className="patient-name">{row.patients?.full_name ?? "Patient"}<small>{row.location ?? "Location not recorded"}</small></div><span>{row.patients?.registration_no ?? "Registration pending"}</span><span>{new Date(row.admitted_at).toLocaleDateString()}</span><span style={{ color: "#2b8078", fontWeight: 700 }}>Open →</span></Link>)}
    </div>
  </AppShell>;
}
