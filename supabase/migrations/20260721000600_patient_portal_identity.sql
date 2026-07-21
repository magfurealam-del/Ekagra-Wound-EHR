create table if not exists identity.patient_portal_users (user_id uuid primary key references auth.users(id) on delete cascade, patient_id uuid not null references patients.records(id) on delete restrict, phone text not null, status identity.record_status not null default 'active', linked_at timestamptz not null default now(), unique(patient_id));
alter table identity.patient_portal_users enable row level security;
create policy portal_self_access on identity.patient_portal_users for select to authenticated using (user_id = auth.uid());
create policy portal_staff_manage on identity.patient_portal_users for all to authenticated using (identity.is_active_staff()) with check (identity.is_active_staff());
