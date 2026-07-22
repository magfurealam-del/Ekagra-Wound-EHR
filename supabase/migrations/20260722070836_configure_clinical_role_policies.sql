create or replace function clinical.enforce_ipd_section_role()
returns trigger
language plpgsql
set search_path = clinical, identity, pg_temp
as $$
declare
  current_role identity.user_role;
begin
  if current_setting('request.jwt.claim.role', true) = 'service_role' then return new; end if;
  select role into current_role from identity.staff_profiles where id = auth.uid() and status = 'active';
  if current_role is null then raise exception 'Active staff profile required'; end if;
  if (tg_op = 'INSERT' or new.nurse_payload is distinct from old.nurse_payload) and new.nurse_payload <> '{}'::jsonb and current_role <> 'nurse' then raise exception 'Only nurses may write nurse entries'; end if;
  if (tg_op = 'INSERT' or new.medical_officer_payload is distinct from old.medical_officer_payload) and new.medical_officer_payload <> '{}'::jsonb and current_role not in ('medical_officer','consultant','physician','super_admin') then raise exception 'Only medical officers may write medical officer entries'; end if;
  if (tg_op = 'INSERT' or new.consultant_payload is distinct from old.consultant_payload) and new.consultant_payload <> '{}'::jsonb and current_role not in ('consultant','physician','super_admin') then raise exception 'Only consultants may write consultant entries'; end if;
  return new;
end;
$$;

drop policy if exists orders_physician_only on treatment.orders;
create policy orders_clinician_only on treatment.orders for all to authenticated
  using (identity.can_access_patient(patient_id) and identity.has_role(array['physician'::identity.user_role,'consultant'::identity.user_role,'super_admin'::identity.user_role]))
  with check (identity.can_access_patient(patient_id) and identity.has_role(array['physician'::identity.user_role,'consultant'::identity.user_role,'super_admin'::identity.user_role]));

drop policy if exists consultations_physician_write on treatment.consultations;
create policy consultations_physician_write on treatment.consultations
  for all to authenticated
  using (identity.can_access_patient(patient_id) and identity.has_role(array['physician'::identity.user_role,'consultant'::identity.user_role,'super_admin'::identity.user_role]))
  with check (identity.can_access_patient(patient_id) and identity.has_role(array['physician'::identity.user_role,'consultant'::identity.user_role,'super_admin'::identity.user_role]));

drop policy if exists transfusions_physician_write on treatment.transfusions;
create policy transfusions_physician_write on treatment.transfusions
  for all to authenticated
  using (identity.can_access_patient(patient_id) and identity.has_role(array['physician'::identity.user_role,'consultant'::identity.user_role,'super_admin'::identity.user_role]))
  with check (identity.can_access_patient(patient_id) and identity.has_role(array['physician'::identity.user_role,'consultant'::identity.user_role,'super_admin'::identity.user_role]));

drop policy if exists hbot_clinical_write on treatment.hbot_sessions;
create policy hbot_clinical_write on treatment.hbot_sessions
  for all to authenticated
  using (identity.can_access_patient(patient_id) and identity.has_role(array['physician'::identity.user_role,'consultant'::identity.user_role,'super_admin'::identity.user_role,'wound_tech'::identity.user_role]))
  with check (identity.can_access_patient(patient_id) and identity.has_role(array['physician'::identity.user_role,'consultant'::identity.user_role,'super_admin'::identity.user_role,'wound_tech'::identity.user_role]));
