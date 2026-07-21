"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";

type Staff = { full_name: string; role: string; clinicName: string };

export function StaffIdentity() {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [state, setState] = useState("Loading profile…");

  useEffect(() => {
    const client = createBrowserClient();
    if (!client) { setState("Supabase is not configured"); return; }
    void (async () => {
      const { data: { user } } = await client.auth.getUser();
      if (!user) { setState("Not signed in"); return; }
      const { data, error } = await client.schema("identity").from("staff_profiles").select("full_name, role, staff_clinic_memberships(clinics(name))").eq("id", user.id).single();
      if (error || !data) { setState("Profile unavailable"); return; }
      const membership = Array.isArray(data.staff_clinic_memberships) ? data.staff_clinic_memberships[0] : null;
      const clinic = membership?.clinics as { name?: string } | null;
      setStaff({ full_name: data.full_name, role: data.role.replaceAll("_", " "), clinicName: clinic?.name ?? "Clinic membership pending" });
      setState("");
    })();
  }, []);

  if (!staff) return <div className="user-chip"><span className="avatar">…</span><span>{state}<br /><small>Clinical identity</small></span></div>;
  return <div className="user-chip"><span className="avatar">{staff.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span>{staff.full_name}<br /><small>{staff.role} · {staff.clinicName}</small></span></div>;
}
