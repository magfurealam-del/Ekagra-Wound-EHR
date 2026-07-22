alter table clinical.ipd_admissions add column if not exists encounter_id uuid references clinical.encounters(id);
alter table clinical.ipd_daily_logs add column if not exists confirmed_by uuid references identity.staff_profiles(id);
alter table clinical.ipd_daily_logs add column if not exists confirmed_at timestamptz;
alter table clinical.ipd_daily_logs add column if not exists locked_by uuid references identity.staff_profiles(id);
alter table clinical.ipd_daily_logs add column if not exists locked_at timestamptz;
alter table clinical.ipd_daily_logs add column if not exists amendment_reason text;

create table if not exists clinical.ipd_admission_notes (
  id uuid primary key default gen_random_uuid(), admission_id uuid not null unique references clinical.ipd_admissions(id) on delete restrict,
  history_payload jsonb not null default '{}', examination_payload jsonb not null default '{}', safety_payload jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft','confirmed')),
  template_version integer not null default 1, created_by uuid not null references identity.staff_profiles(id),
  confirmed_by uuid references identity.staff_profiles(id), confirmed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists clinical.ipd_intake_output_entries (
  id uuid primary key default gen_random_uuid(), admission_id uuid not null references clinical.ipd_admissions(id) on delete restrict,
  daily_log_id uuid references clinical.ipd_daily_logs(id) on delete restrict, entry_date date not null default current_date, entry_time time not null default localtime,
  category text not null check (category in ('feed','infusion','urine','stool','vomit','suction','drain','other')),
  direction text not null check (direction in ('input','output')), amount_ml numeric(10,2) not null check (amount_ml > 0), note text,
  recorded_by uuid not null references identity.staff_profiles(id), created_at timestamptz not null default now()
);
create table if not exists clinical.ipd_discharge_summaries (
  id uuid primary key default gen_random_uuid(), admission_id uuid not null unique references clinical.ipd_admissions(id) on delete restrict,
  diagnosis text not null, condition_at_discharge text, medication_reconciliation text, wound_state text, follow_up_plan text,
  status text not null default 'draft' check (status in ('draft','signed')), created_by uuid not null references identity.staff_profiles(id),
  consultant_id uuid references identity.staff_profiles(id), signed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index if not exists ipd_io_admission_date_idx on clinical.ipd_intake_output_entries(admission_id, entry_date);
create index if not exists ipd_admission_notes_admission_idx on clinical.ipd_admission_notes(admission_id);
create index if not exists ipd_discharge_admission_idx on clinical.ipd_discharge_summaries(admission_id);

grant select, insert, update on clinical.ipd_admission_notes, clinical.ipd_intake_output_entries, clinical.ipd_discharge_summaries to authenticated;
revoke delete on clinical.ipd_admission_notes, clinical.ipd_intake_output_entries, clinical.ipd_discharge_summaries from authenticated;

alter table clinical.ipd_admission_notes enable row level security;
alter table clinical.ipd_intake_output_entries enable row level security;
alter table clinical.ipd_discharge_summaries enable row level security;
drop policy if exists ipd_admission_notes_access on clinical.ipd_admission_notes;
create policy ipd_admission_notes_access on clinical.ipd_admission_notes for all to authenticated
  using (exists (select 1 from clinical.ipd_admissions a where a.id=admission_id and identity.can_access_patient(a.patient_id)))
  with check (identity.is_active_staff() and exists (select 1 from clinical.ipd_admissions a where a.id=admission_id and identity.can_access_patient(a.patient_id)));
drop policy if exists ipd_io_access on clinical.ipd_intake_output_entries;
create policy ipd_io_access on clinical.ipd_intake_output_entries for all to authenticated
  using (exists (select 1 from clinical.ipd_admissions a where a.id=admission_id and identity.can_access_patient(a.patient_id)))
  with check (identity.is_active_staff() and exists (select 1 from clinical.ipd_admissions a where a.id=admission_id and identity.can_access_patient(a.patient_id)));
drop policy if exists ipd_discharge_access on clinical.ipd_discharge_summaries;
create policy ipd_discharge_access on clinical.ipd_discharge_summaries for select to authenticated using (exists (select 1 from clinical.ipd_admissions a where a.id=admission_id and identity.can_access_patient(a.patient_id)));
create policy ipd_discharge_write on clinical.ipd_discharge_summaries for insert to authenticated with check (identity.is_active_staff() and identity.has_role(array['physician'::identity.user_role,'consultant'::identity.user_role,'super_admin'::identity.user_role]) and exists (select 1 from clinical.ipd_admissions a where a.id=admission_id and identity.can_access_patient(a.patient_id)));
create policy ipd_discharge_update on clinical.ipd_discharge_summaries for update to authenticated using (identity.has_role(array['physician'::identity.user_role,'consultant'::identity.user_role,'super_admin'::identity.user_role])) with check (identity.has_role(array['physician'::identity.user_role,'consultant'::identity.user_role,'super_admin'::identity.user_role]));

create or replace function clinical.enforce_ipd_lock_state() returns trigger language plpgsql set search_path=clinical,identity,pg_temp as $$
declare r identity.user_role;
begin
  if current_setting('request.jwt.claim.role', true)='service_role' then return new; end if;
  if old.status='locked' then raise exception 'Locked IPD logs require an amendment workflow'; end if;
  if new.status='locked' then
    select role into r from identity.staff_profiles where id=auth.uid() and status='active';
    if r not in ('consultant','physician','super_admin') then raise exception 'Only a consultant may lock an IPD daily log'; end if;
    new.locked_by=auth.uid(); new.locked_at=coalesce(new.locked_at,now()); new.confirmed_by=auth.uid(); new.confirmed_at=coalesce(new.confirmed_at,now());
  end if;
  return new;
end; $$;
drop trigger if exists enforce_ipd_lock_state on clinical.ipd_daily_logs;
create trigger enforce_ipd_lock_state before update on clinical.ipd_daily_logs for each row execute function clinical.enforce_ipd_lock_state();

create or replace function clinical.enforce_ipd_review_role() returns trigger language plpgsql set search_path=clinical,identity,pg_temp as $$
declare r identity.user_role;
begin
  if current_setting('request.jwt.claim.role', true)='service_role' then return new; end if;
  select role into r from identity.staff_profiles where id=auth.uid() and status='active';
  if r is null or new.reviewer_id<>auth.uid() then raise exception 'Active reviewer profile required'; end if;
  if new.reviewer_role='nurse' and r<>'nurse' then raise exception 'Nurse signature requires nurse role'; end if;
  if new.reviewer_role='medical_officer' and r not in ('medical_officer','consultant','physician','super_admin') then raise exception 'Medical officer signature required'; end if;
  if new.reviewer_role='consultant' and r not in ('consultant','physician','super_admin') then raise exception 'Consultant signature required'; end if;
  return new;
end; $$;
drop trigger if exists enforce_ipd_review_role on clinical.ipd_reviews;
create trigger enforce_ipd_review_role before insert on clinical.ipd_reviews for each row execute function clinical.enforce_ipd_review_role();
