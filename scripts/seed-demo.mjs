import { createClient } from "@supabase/supabase-js";

const projectId = "zhodknuzuyxzqgfjrghj";
const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const demoPassword = process.env.EKAGRA_DEMO_PASSWORD;

if (!url || !serviceRoleKey || !demoPassword) {
  throw new Error("Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and EKAGRA_DEMO_PASSWORD before running the demo seed.");
}
if (new URL(url).hostname.split(".")[0] !== projectId) {
  throw new Error(`Refusing to seed unexpected Supabase project: ${url}`);
}
if (demoPassword.length < 12) {
  throw new Error("EKAGRA_DEMO_PASSWORD must be at least 12 characters.");
}

const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function one(schema, table, query) {
  const result = await admin.schema(schema).from(table).select("*").match(query).limit(1).maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

async function insert(schema, table, values) {
  const result = await admin.schema(schema).from(table).insert(values).select("*").single();
  if (result.error) throw result.error;
  return result.data;
}

async function upsert(schema, table, values, onConflict) {
  const result = await admin.schema(schema).from(table).upsert(values, { onConflict }).select("*").single();
  if (result.error) throw result.error;
  return result.data;
}

async function ensureAuthUser(email, phone = undefined) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) throw listed.error;
  const existing = listed.data.users.find((user) => user.email === email);
  if (existing) return existing;
  const result = await admin.auth.admin.createUser({
    email,
    password: demoPassword,
    email_confirm: true,
    ...(phone ? { phone, phone_confirm: true } : {})
  });
  if (result.error) throw result.error;
  return result.data.user;
}

async function ensurePatient(clinicId, staffId, patient) {
  const existing = await one("patients", "records", { national_id: patient.national_id });
  const record = existing ?? await insert("patients", "records", {
    ...patient,
    primary_clinic_id: clinicId,
    registration_no: `SYN-${patient.national_id.slice(-4)}`
  });
  await upsert("patients", "clinic_access", { patient_id: record.id, clinic_id: clinicId, granted_by: staffId, reason: "Synthetic verification data" }, "patient_id,clinic_id");
  const consent = await one("patients", "consents", { patient_id: record.id, consent_type: "photo" });
  if (!consent) await insert("patients", "consents", { patient_id: record.id, consent_type: "photo", checkbox_confirmed: true, captured_by: staffId });
  return record;
}

const clinic = await (async () => {
  const existing = await one("identity", "clinics", { name: "Ekagra Synthetic Verification Clinic" });
  return existing ?? insert("identity", "clinics", { name: "Ekagra Synthetic Verification Clinic", address: "Synthetic test environment", is_partner: false, status: "active" });
})();

const staffSpecs = [
  { key: "consultant", email: "consultant@ekagra.test", full_name: "Dr. Amina Consultant", role: "consultant", license_no: "SYN-CONSULTANT" },
  { key: "mo", email: "mo@ekagra.test", full_name: "Dr. Karim Medical Officer", role: "medical_officer", license_no: "SYN-MO" },
  { key: "nurse", email: "nurse@ekagra.test", full_name: "Nabila Nurse", role: "nurse" },
  { key: "woundTech", email: "wound.tech@ekagra.test", full_name: "Sadia Wound Technician", role: "wound_tech" },
  { key: "admin", email: "clinic.admin@ekagra.test", full_name: "Ekagra Clinic Admin", role: "clinic_admin" }
];

const staff = {};
for (const spec of staffSpecs) {
  const user = await ensureAuthUser(spec.email);
  staff[spec.key] = await upsert("identity", "staff_profiles", { id: user.id, full_name: spec.full_name, role: spec.role, email: spec.email, license_no: spec.license_no ?? null, status: "active" }, "id");
  await upsert("identity", "staff_clinic_memberships", { staff_id: user.id, clinic_id: clinic.id }, "staff_id,clinic_id");
}

const patients = {};
const patientSpecs = [
  { key: "rahima", full_name: "Rahima Synthetic", national_id: "SYNTH-0001", phone: "+8801700000001", dob: "1958-04-12", sex: "Female" },
  { key: "abdul", full_name: "Abdul Synthetic", national_id: "SYNTH-0002", phone: "+8801700000002", dob: "1965-09-03", sex: "Male" },
  { key: "shamima", full_name: "Shamima Synthetic", national_id: "SYNTH-0003", phone: "+8801700000003", dob: "1972-01-21", sex: "Female" },
  { key: "hasan", full_name: "Hasan Synthetic", national_id: "SYNTH-0004", phone: "+8801700000004", dob: "1951-11-08", sex: "Male" }
];
for (const spec of patientSpecs) patients[spec.key] = await ensurePatient(clinic.id, staff.admin.id, spec);

const encounter = await insert("clinical", "encounters", { patient_id: patients.rahima.id, clinic_id: clinic.id, physician_id: staff.consultant.id, encounter_type: "ipd", status: "open" });
const admission = await insert("clinical", "ipd_admissions", { patient_id: patients.rahima.id, clinic_id: clinic.id, location: "Ward A · Bed 04", admitted_by: staff.consultant.id, status: "active" });
const dailyLog = await insert("clinical", "ipd_daily_logs", {
  admission_id: admission.id,
  log_date: new Date().toISOString().slice(0, 10),
  is_partial: false,
  nurse_payload: { observations: { pulse: 82, bp: "138/84", spo2: 98, temperature: 36.8 }, nursing_note: "Synthetic admission observation" },
  medical_officer_payload: { complaints: "Synthetic follow-up complaint", assessment: "Requires routine wound review", plan: "Continue observation" },
  consultant_payload: { diagnosis: "Synthetic diabetic foot case", plan: "Review daily chart and wound progress" },
  status: "open"
});
await insert("clinical", "ipd_entry_schedules", { daily_log_id: dailyLog.id, section: "nurse", frequency: "once_daily", status: "pending" });
await insert("clinical", "ipd_entry_schedules", { daily_log_id: dailyLog.id, section: "medical_officer", frequency: "twice_daily", status: "pending" });
await insert("clinical", "ipd_entry_schedules", { daily_log_id: dailyLog.id, section: "consultant", frequency: "once_daily", status: "pending" });
await insert("clinical", "observations", { encounter_id: encounter.id, pulse: 82, bp_systolic: 138, bp_diastolic: 84, spo2: 98, sugar: 9.4, temperature: 36.8, respiration: 18, source_form: "Synthetic IPD observation chart", recorded_by: staff.nurse.id });
await insert("treatment", "orders", { patient_id: patients.rahima.id, encounter_id: encounter.id, order_type: "medication", generic_name: "Synthetic saline", dose: "500 mL", frequency: "Once", route: "IV", instructions: "Demonstration order only", ordered_by: staff.consultant.id });

const opdEncounter = await insert("clinical", "encounters", { patient_id: patients.abdul.id, clinic_id: clinic.id, physician_id: staff.mo.id, encounter_type: "opd", status: "open" });
const opdVisit = await insert("clinical", "opd_visits", { patient_id: patients.abdul.id, clinic_id: clinic.id, visit_reason: "Synthetic wound follow-up", created_by: staff.mo.id });
const wound = await insert("clinical", "wounds", { patient_id: patients.abdul.id, wound_type: "Diabetic Foot", site: "Right plantar foot", laterality: "right", first_noted_date: new Date().toISOString().slice(0, 10) });
const assessment = await insert("clinical", "wound_assessments", { wound_id: wound.id, opd_visit_id: opdVisit.id, stage_or_grade: "Synthetic draft", length_cm: 3.2, width_cm: 2.1, depth_cm: 0.4, payload: { pain: "moderate", exudate: "low", tissue: "granulation", note: "Synthetic assessment for form review" }, status: "draft", created_by: staff.nurse.id });
const map = await one("clinical", "anatomy_map_versions", { version_number: 1 });
if (map) await insert("clinical", "wound_locations", { wound_id: wound.id, assessment_id: assessment.id, map_version_id: map.id, body_view: "foot_plantar", region_code: "heel", laterality: "right", surface: "plantar", zone_code: "medial", label: "Right foot → plantar → heel → medial zone" });
await insert("investigations", "lab_results", { patient_id: patients.abdul.id, encounter_id: opdEncounter.id, test_name: "HbA1c", value_text: "8.2", unit: "%", reference_range: "4.0–6.5", test_date: new Date().toISOString().slice(0, 10), extraction_confidence: 1, verified_by: staff.consultant.id, verified_at: new Date().toISOString() });
await insert("referrals", "records", { patient_id: patients.shamima.id, from_physician_id: staff.consultant.id, from_clinic_id: clinic.id, to_clinic_id: clinic.id, reason: "Synthetic vascular review", status: "sent" });

console.log("Synthetic data created in Supabase project", projectId);
console.log("Clinic:", clinic.name);
console.log("Staff login emails:", staffSpecs.map((spec) => spec.email).join(", "));
console.log("Patients:", patientSpecs.map((spec) => spec.full_name).join(", "));
console.log("Use the password supplied via EKAGRA_DEMO_PASSWORD; it is not printed or stored by this script.");
