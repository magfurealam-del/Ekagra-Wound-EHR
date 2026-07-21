-- Integration boundary fixes: patient portal visibility and IPD role enforcement.
alter table clinical.clinical_signatures add column if not exists wound_id uuid references clinical.wounds(id) on delete restrict;

create or replace function clinical.enforce_ipd_section_role()
returns trigger
language plpgsql
set search_path = clinical, identity, pg_temp
as $$
declare
  current_role identity.user_role;
begin
  select role into current_role from identity.staff_profiles where id = auth.uid() and status = 'active';
  if current_role is null then raise exception 'Active staff profile required'; end if;
  if (tg_op = 'INSERT' or new.nurse_payload is distinct from old.nurse_payload) and new.nurse_payload <> '{}'::jsonb and current_role <> 'nurse' then raise exception 'Only nurses may write nurse entries'; end if;
  if (tg_op = 'INSERT' or new.medical_officer_payload is distinct from old.medical_officer_payload) and new.medical_officer_payload <> '{}'::jsonb and current_role not in ('physician','super_admin') then raise exception 'Only physicians may write medical officer entries'; end if;
  if (tg_op = 'INSERT' or new.consultant_payload is distinct from old.consultant_payload) and new.consultant_payload <> '{}'::jsonb and current_role not in ('physician','super_admin') then raise exception 'Only physicians may write consultant entries'; end if;
  return new;
end;
$$;
drop trigger if exists enforce_ipd_section_role on clinical.ipd_daily_logs;
create trigger enforce_ipd_section_role before insert or update on clinical.ipd_daily_logs for each row execute function clinical.enforce_ipd_section_role();

create policy portal_patient_record_read on patients.records for select to authenticated
  using (exists (select 1 from identity.patient_portal_users p where p.user_id = auth.uid() and p.patient_id = id and p.status = 'active'));
create policy portal_wound_read on clinical.wounds for select to authenticated
  using (exists (select 1 from identity.patient_portal_users p where p.user_id = auth.uid() and p.patient_id = patient_id and p.status = 'active'));
create policy portal_confirmed_assessment_read on clinical.wound_assessments for select to authenticated
  using (status = 'physician_confirmed' and exists (select 1 from clinical.wounds w join identity.patient_portal_users p on p.patient_id = w.patient_id where w.id = wound_id and p.user_id = auth.uid() and p.status = 'active'));
create policy portal_confirmed_photo_read on clinical.wound_photos for select to authenticated
  using (exists (select 1 from clinical.wound_assessments a join clinical.wounds w on w.id = a.wound_id join identity.patient_portal_users p on p.patient_id = w.patient_id where a.id = wound_assessment_id and a.status = 'physician_confirmed' and p.user_id = auth.uid() and p.status = 'active'));
