"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/app/app-shell";
import { createBrowserClient } from "@/lib/supabase/browser";

type Patient = { id: string; full_name: string; registration_no: string | null; phone: string | null; sex: string | null; created_at: string };

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]); const [query, setQuery] = useState(""); const [message, setMessage] = useState("Loading patients…");
  useEffect(() => { const client = createBrowserClient(); if (!client) { setMessage("Supabase is not configured."); return; } void (async () => { const { data, error } = await client.schema("patients").from("records").select("id, full_name, registration_no, phone, sex, created_at").order("created_at", { ascending: false }); if (error) setMessage(error.message); else { setPatients(data ?? []); setMessage(""); } })(); }, []);
  const filtered = useMemo(() => { const value = query.toLowerCase().trim(); return value ? patients.filter((patient) => [patient.full_name, patient.registration_no, patient.phone].some((field) => field?.toLowerCase().includes(value))) : patients; }, [patients, query]);
  return <AppShell active="Patients"><div className="page-heading"><div><h1>Patients</h1><p>Find a patient or open a clinical record.</p></div><Link className="workspace-button" href="/app/patients/new">+ Register patient</Link></div><div className="panel"><input className="search-box" style={{ width: "100%", marginBottom: 15 }} placeholder="Search name, NID, phone or registration number" value={query} onChange={(event) => setQuery(event.target.value)} />{message && <p>{message}</p>}{!message && filtered.length === 0 && <p>No patients found.</p>}{filtered.map((patient) => <Link href={`/app/patients/${patient.id}`} className="patient-row" key={patient.id}><div className="patient-name">{patient.full_name}<small>{patient.registration_no ?? "Registration pending"}</small></div><span>{patient.sex ?? "Not recorded"}</span><span>{patient.phone ?? "No phone"}</span><span className="badge">Active</span></Link>)}</div></AppShell>;
}
