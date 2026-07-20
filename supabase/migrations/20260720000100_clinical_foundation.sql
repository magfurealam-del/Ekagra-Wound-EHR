-- Ekagra Wound EHR clinical foundation.
-- Billing is intentionally out of this project and has no foreign keys here.
create extension if not exists pgcrypto;

create schema if not exists identity;
create schema if not exists patients;
create schema if not exists clinical;
create schema if not exists treatment;
create schema if not exists investigations;
create schema if not exists referrals;
create schema if not exists operations;

create type identity.user_role as enum ('physician','nurse','wound_tech','clinic_admin','super_admin','patient');
create type identity.record_status as enum ('active','deactivated','offboarded');
create type clinical.encounter_type as enum ('opd','ipd');
create type clinical.wound_status as enum ('active','healed');
create type clinical.assessment_status as enum ('draft','returned','physician_confirmed');
create type referrals.referral_status as enum ('draft','sent','accepted','declined','closed','expired');

create table identity.clinics (
  id uuid primary key default gen_random_uuid(), name text not null, address text,
  is_partner boolean not null default false, status identity.record_status not null default 'active',
  created_at timestamptz not null default now()
);
create table identity.staff_profiles (
  id uuid primary key references auth.users(id) on delete restrict, role identity.user_role not null,
  full_name text not null, phone text, email text, license_no text, status identity.record_status not null default 'active',
  deactivated_at timestamptz, created_at timestamptz not null default now()
);
create table identity.staff_clinic_memberships (
  staff_id uuid not null references identity.staff_profiles(id) on delete restrict,
  clinic_id uuid not null references identity.clinics(id) on delete restrict,
  primary key (staff_id, clinic_id)
);

create table patients.records (
  id uuid primary key default gen_random_uuid(), full_name text not null, national_id text not null,
  phone text, dob date, sex text, primary_clinic_id uuid not null references identity.clinics(id),
  registration_no text unique, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index patients_national_id_unique on patients.records(national_id) where national_id <> '';
create table patients.clinic_access (
  patient_id uuid not null references patients.records(id) on delete restrict,
  clinic_id uuid not null references identity.clinics(id) on delete restrict,
  granted_by uuid references identity.staff_profiles(id), granted_at timestamptz not null default now(),
  expires_at timestamptz, reason text, primary key (patient_id, clinic_id)
);
create table patients.consents (
  id uuid primary key default gen_random_uuid(), patient_id uuid not null references patients.records(id) on delete restrict,
  consent_type text not null check (consent_type in ('treatment','photo','referral_sharing')),
  signature_path text, checkbox_confirmed boolean not null default false, captured_by uuid references identity.staff_profiles(id),
  captured_at timestamptz not null default now()
);

create table clinical.encounters (
  id uuid primary key default gen_random_uuid(), patient_id uuid not null references patients.records(id) on delete restrict,
  clinic_id uuid not null references identity.clinics(id) on delete restrict, physician_id uuid references identity.staff_profiles(id),
  encounter_type clinical.encounter_type not null, status text not null default 'open', started_at timestamptz not null default now(), closed_at timestamptz
);
create table operations.wound_type_templates (
  id uuid primary key default gen_random_uuid(), wound_type text unique not null, version int not null default 1,
  fields jsonb not null default '[]'::jsonb, is_active boolean not null default true, updated_by uuid references identity.staff_profiles(id), updated_at timestamptz not null default now()
);
create table clinical.wounds (
  id uuid primary key default gen_random_uuid(), patient_id uuid not null references patients.records(id) on delete restrict,
  wound_type text not null, site text, laterality text, status clinical.wound_status not null default 'active', first_noted_date date, created_at timestamptz not null default now()
);
create table clinical.wound_assessments (
  id uuid primary key default gen_random_uuid(), wound_id uuid not null references clinical.wounds(id) on delete restrict,
  encounter_id uuid references clinical.encounters(id) on delete restrict, stage_or_grade text, length_cm numeric, width_cm numeric, depth_cm numeric,
  payload jsonb not null default '{}'::jsonb, status clinical.assessment_status not null default 'draft', created_by uuid not null references identity.staff_profiles(id),
  confirmed_by uuid references identity.staff_profiles(id), confirmed_at timestamptz, template_version int not null default 1, created_at timestamptz not null default now()
);
create table clinical.wound_photos (
  id uuid primary key default gen_random_uuid(), wound_assessment_id uuid not null references clinical.wound_assessments(id) on delete restrict,
  storage_path text not null, taken_at timestamptz not null default now(), angle text, note text, storage_tier text not null default 'hot'
);
create table clinical.observations (
  id uuid primary key default gen_random_uuid(), encounter_id uuid not null references clinical.encounters(id) on delete restrict,
  observed_at timestamptz not null default now(), pulse numeric, bp_systolic numeric, bp_diastolic numeric, spo2 numeric,
  sugar numeric, temperature numeric, respiration numeric, source_form text, recorded_by uuid not null references identity.staff_profiles(id)
);
create table clinical.ipd_forms (
  id uuid primary key default gen_random_uuid(), encounter_id uuid not null references clinical.encounters(id) on delete restrict,
  form_type text not null, template_version int not null default 1, payload jsonb not null default '{}'::jsonb,
  filled_by uuid not null references identity.staff_profiles(id), filled_at timestamptz not null default now()
);
create table clinical.form_drafts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references identity.staff_profiles(id), form_type text not null,
  entity_id uuid, payload jsonb not null default '{}'::jsonb, saved_at timestamptz not null default now()
);

create table treatment.orders (
  id uuid primary key default gen_random_uuid(), patient_id uuid not null references patients.records(id) on delete restrict,
  encounter_id uuid references clinical.encounters(id) on delete restrict, order_type text not null, generic_name text, brand_name text,
  dose text, frequency text, route text, instructions text, ordered_by uuid not null references identity.staff_profiles(id), ordered_at timestamptz not null default now()
);
create table treatment.medication_administrations (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references treatment.orders(id) on delete restrict,
  administered_at timestamptz not null, given_by uuid not null references identity.staff_profiles(id), status text not null default 'given', note text
);
create table treatment.procedures (id uuid primary key default gen_random_uuid(), patient_id uuid not null references patients.records(id) on delete restrict, encounter_id uuid references clinical.encounters(id), procedure_name text not null, performed_at timestamptz not null default now(), duty_doctor_id uuid references identity.staff_profiles(id), signature_path text);
create table treatment.consultations (id uuid primary key default gen_random_uuid(), patient_id uuid not null references patients.records(id) on delete restrict, encounter_id uuid references clinical.encounters(id), specialty text not null, note text, attending_doctor_id uuid references identity.staff_profiles(id), signed_at timestamptz);
create table treatment.transfusions (id uuid primary key default gen_random_uuid(), patient_id uuid not null references patients.records(id) on delete restrict, encounter_id uuid references clinical.encounters(id), blood_group text, donor_no text, bag_no text, lab_no text, cross_match_status text, screening_status text, order_text text, reaction_note text, signed_by uuid references identity.staff_profiles(id), signed_at timestamptz);
create table treatment.hbot_sessions (id uuid primary key default gen_random_uuid(), patient_id uuid not null references patients.records(id) on delete restrict, encounter_id uuid references clinical.encounters(id), dive_no text, dive_date date, dosage text, target_pressure text, chamber_pressure text, o2_flow_rate text, total_ata_min numeric, clearance text, recorded_by uuid references identity.staff_profiles(id));

create table investigations.documents (
  id uuid primary key default gen_random_uuid(), patient_id uuid not null references patients.records(id) on delete restrict, encounter_id uuid references clinical.encounters(id),
  document_name text not null, description text, tag text, document_type text not null, storage_path text not null, mime_type text not null, size_bytes bigint not null check (size_bytes <= 31457280), uploaded_by uuid not null references identity.staff_profiles(id), uploaded_at timestamptz not null default now()
);
create table investigations.lab_results (
  id uuid primary key default gen_random_uuid(), patient_id uuid not null references patients.records(id) on delete restrict, encounter_id uuid references clinical.encounters(id), source_document_id uuid references investigations.documents(id), test_name text not null, value numeric, value_text text, unit text, reference_range text, test_date date, extraction_confidence numeric check (extraction_confidence between 0 and 1), verified_by uuid references identity.staff_profiles(id), verified_at timestamptz
);
create table investigations.alerts (
  id uuid primary key default gen_random_uuid(), patient_id uuid not null references patients.records(id) on delete restrict, source text not null, severity text not null, message text not null, acknowledged_by uuid references identity.staff_profiles(id), acknowledged_at timestamptz, created_at timestamptz not null default now()
);

create table referrals.records (
  id uuid primary key default gen_random_uuid(), patient_id uuid not null references patients.records(id) on delete restrict, from_physician_id uuid references identity.staff_profiles(id), from_clinic_id uuid references identity.clinics(id), to_physician_id uuid references identity.staff_profiles(id), to_clinic_id uuid references identity.clinics(id), external_physician_name text, external_contact text, reason text not null, status referrals.referral_status not null default 'draft', consent_override_reason text, created_at timestamptz not null default now(), closed_at timestamptz
);
create table referrals.access_events (id uuid primary key default gen_random_uuid(), referral_id uuid not null references referrals.records(id) on delete restrict, actor_id uuid references identity.staff_profiles(id), action text not null, occurred_at timestamptz not null default now());

create table operations.audit_log (id uuid primary key default gen_random_uuid(), actor_id uuid references identity.staff_profiles(id), action text not null, entity text not null, entity_id uuid, metadata jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now());
create table operations.notifications_log (id uuid primary key default gen_random_uuid(), patient_id uuid references patients.records(id), channel text not null, notification_type text not null, status text not null, sent_at timestamptz, metadata jsonb not null default '{}'::jsonb);

create index on patients.records (primary_clinic_id, full_name);
create index on clinical.encounters (patient_id, clinic_id, started_at desc);
create index on clinical.wounds (patient_id, status);
create index on clinical.wound_assessments (wound_id, created_at desc, status);
create index on clinical.observations (encounter_id, observed_at desc);
create index on investigations.lab_results (patient_id, test_date desc);
create index on investigations.alerts (patient_id, severity, acknowledged_at);
create index on referrals.records (to_clinic_id, status, created_at desc);

-- Enable RLS on every table. Policies are added in the next migration after helper predicates are verified in staging.
do $$ declare r record; begin for r in select schemaname, tablename from pg_tables where schemaname in ('identity','patients','clinical','treatment','investigations','referrals','operations') loop execute format('alter table %I.%I enable row level security', r.schemaname, r.tablename); end loop; end $$;
