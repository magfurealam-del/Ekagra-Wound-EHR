-- OPD longitudinal wound workflow.
-- Confirmed assessments are preserved; corrections are represented as linked versions.

create table clinical.opd_visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients.records(id) on delete restrict,
  clinic_id uuid not null references identity.clinics(id) on delete restrict,
  visit_started_at timestamptz not null default now(),
  visit_ended_at timestamptz,
  visit_reason text,
  created_by uuid not null references identity.staff_profiles(id),
  created_at timestamptz not null default now()
);

create table clinical.anatomy_map_versions (
  id uuid primary key default gen_random_uuid(),
  version_number int not null unique,
  status text not null default 'draft' check (status in ('draft','clinician_review','approved','retired')),
  definition jsonb not null default '{}'::jsonb,
  created_by uuid references identity.staff_profiles(id),
  approved_by uuid references identity.staff_profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table clinical.wound_locations (
  id uuid primary key default gen_random_uuid(),
  wound_id uuid not null references clinical.wounds(id) on delete restrict,
  assessment_id uuid references clinical.wound_assessments(id) on delete restrict,
  map_version_id uuid not null references clinical.anatomy_map_versions(id),
  body_view text not null check (body_view in ('anterior','posterior','foot_dorsal','foot_plantar')),
  region_code text not null,
  subregion_code text,
  laterality text not null check (laterality in ('left','right','bilateral','midline','not_applicable')),
  surface text,
  zone_code text,
  label text not null,
  created_at timestamptz not null default now(),
  unique (assessment_id)
);

alter table clinical.wound_assessments
  add column if not exists opd_visit_id uuid references clinical.opd_visits(id) on delete restrict,
  add column if not exists previous_confirmed_assessment_id uuid references clinical.wound_assessments(id) on delete restrict,
  add column if not exists area_cm2 numeric generated always as (length_cm * width_cm) stored,
  add column if not exists area_change_percent numeric,
  add column if not exists mo_confirmed_by uuid references identity.staff_profiles(id),
  add column if not exists mo_confirmed_at timestamptz,
  add column if not exists consultant_confirmed_by uuid references identity.staff_profiles(id),
  add column if not exists consultant_confirmed_at timestamptz,
  add column if not exists healed_by uuid references identity.staff_profiles(id),
  add column if not exists healed_at timestamptz,
  add column if not exists amendment_reason text;

create table clinical.wound_assessment_versions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references clinical.wound_assessments(id) on delete restrict,
  version_number int not null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid not null references identity.staff_profiles(id),
  created_at timestamptz not null default now(),
  correction_reason text,
  unique (assessment_id, version_number)
);

create table clinical.clinical_signatures (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references clinical.wound_assessments(id) on delete restrict,
  opd_visit_id uuid references clinical.opd_visits(id) on delete restrict,
  signer_id uuid not null references identity.staff_profiles(id),
  signer_role identity.user_role not null,
  signature_type text not null check (signature_type in ('mo_confirmation','consultant_confirmation','healed_confirmation','correction_review')),
  signed_at timestamptz not null default now(),
  unique (assessment_id, signature_type, signer_id)
);

create table clinical.correction_requests (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references clinical.wound_assessments(id) on delete restrict,
  requested_by uuid not null references identity.staff_profiles(id),
  assigned_to uuid not null references identity.staff_profiles(id),
  reason text not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved','rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references identity.staff_profiles(id)
);

create table clinical.attachments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients.records(id) on delete restrict,
  opd_visit_id uuid references clinical.opd_visits(id) on delete restrict,
  wound_assessment_id uuid references clinical.wound_assessments(id) on delete restrict,
  attachment_type text not null check (attachment_type in ('wound_photo','lab_report','imaging','referral','procedure','consent','other')),
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes <= 31457280),
  metadata jsonb not null default '{}'::jsonb,
  uploaded_by uuid not null references identity.staff_profiles(id),
  uploaded_at timestamptz not null default now()
);

create index opd_visits_patient_date_idx on clinical.opd_visits (patient_id, visit_started_at desc);
create index wound_assessments_opd_visit_idx on clinical.wound_assessments (opd_visit_id, created_at desc);
create index wound_locations_wound_idx on clinical.wound_locations (wound_id, created_at desc);
create index attachments_patient_date_idx on clinical.attachments (patient_id, uploaded_at desc);

alter table clinical.opd_visits enable row level security;
alter table clinical.anatomy_map_versions enable row level security;
alter table clinical.wound_locations enable row level security;
alter table clinical.wound_assessment_versions enable row level security;
alter table clinical.clinical_signatures enable row level security;
alter table clinical.correction_requests enable row level security;
alter table clinical.attachments enable row level security;

create policy opd_visits_access on clinical.opd_visits for all to authenticated
  using (identity.can_access_patient(patient_id)) with check (identity.can_access_patient(patient_id));
create policy anatomy_maps_read on clinical.anatomy_map_versions for select to authenticated
  using (identity.is_active_staff());
create policy wound_locations_access on clinical.wound_locations for all to authenticated
  using (exists (select 1 from clinical.wounds w where w.id=wound_id and identity.can_access_patient(w.patient_id)))
  with check (identity.is_active_staff());
create policy wound_versions_access on clinical.wound_assessment_versions for all to authenticated
  using (exists (select 1 from clinical.wound_assessments a join clinical.wounds w on w.id=a.wound_id where a.id=assessment_id and identity.can_access_patient(w.patient_id)))
  with check (identity.is_active_staff());
create policy clinical_signatures_access on clinical.clinical_signatures for all to authenticated
  using (signer_id=auth.uid() or exists (select 1 from clinical.wound_assessments a join clinical.wounds w on w.id=a.wound_id where a.id=assessment_id and identity.can_access_patient(w.patient_id)))
  with check (signer_id=auth.uid() and identity.is_active_staff());
create policy correction_requests_access on clinical.correction_requests for all to authenticated
  using (requested_by=auth.uid() or assigned_to=auth.uid()) with check (identity.is_active_staff());
create policy attachments_access on clinical.attachments for all to authenticated
  using (identity.can_access_patient(patient_id)) with check (identity.is_active_staff());
