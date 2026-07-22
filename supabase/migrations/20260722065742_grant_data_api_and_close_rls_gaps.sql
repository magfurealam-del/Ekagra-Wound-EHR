-- Grant only authenticated users access to the exposed clinical schemas.
-- RLS remains the authorization boundary; these grants only make the Data API callable.
do $$
declare
  schema_name text;
begin
  foreach schema_name in array array['identity','patients','clinical','treatment','investigations','referrals','operations'] loop
    execute format('revoke all on schema %I from anon', schema_name);
    execute format('grant usage on schema %I to authenticated', schema_name);
    execute format('grant select, insert, update, delete on all tables in schema %I to authenticated', schema_name);
  end loop;
end $$;

-- Keep the custom clinical schemas private from anonymous Data API callers.
revoke all on all tables in schema identity from anon;
revoke all on all tables in schema patients from anon;
revoke all on all tables in schema clinical from anon;
revoke all on all tables in schema treatment from anon;
revoke all on all tables in schema investigations from anon;
revoke all on all tables in schema referrals from anon;
revoke all on all tables in schema operations from anon;

-- Close the six RLS-enabled/no-policy findings without granting broad cross-patient access.
create policy notifications_log_staff_read on operations.notifications_log
  for select to authenticated
  using (patient_id is null or identity.can_access_patient(patient_id));

create policy wound_templates_staff_read on operations.wound_type_templates
  for select to authenticated
  using (identity.is_active_staff());

create policy wound_templates_admin_write on operations.wound_type_templates
  for all to authenticated
  using (identity.has_role(array['clinic_admin'::identity.user_role,'super_admin'::identity.user_role]))
  with check (identity.has_role(array['clinic_admin'::identity.user_role,'super_admin'::identity.user_role]));

create policy referral_access_events_read on referrals.access_events
  for select to authenticated
  using (exists (
    select 1 from referrals.records r
    where r.id = referral_id and identity.can_access_patient(r.patient_id)
  ));

create policy referral_access_events_insert on referrals.access_events
  for insert to authenticated
  with check (
    actor_id = auth.uid()
    and identity.is_active_staff()
    and exists (
      select 1 from referrals.records r
      where r.id = referral_id and identity.can_access_patient(r.patient_id)
    )
  );

create policy consultations_staff_read on treatment.consultations
  for select to authenticated
  using (identity.can_access_patient(patient_id));

create policy consultations_physician_write on treatment.consultations
  for all to authenticated
  using (identity.can_access_patient(patient_id) and identity.has_role(array['physician'::identity.user_role,'super_admin'::identity.user_role]))
  with check (identity.can_access_patient(patient_id) and identity.has_role(array['physician'::identity.user_role,'super_admin'::identity.user_role]));

create policy transfusions_staff_read on treatment.transfusions
  for select to authenticated
  using (identity.can_access_patient(patient_id));

create policy transfusions_physician_write on treatment.transfusions
  for all to authenticated
  using (identity.can_access_patient(patient_id) and identity.has_role(array['physician'::identity.user_role,'super_admin'::identity.user_role]))
  with check (identity.can_access_patient(patient_id) and identity.has_role(array['physician'::identity.user_role,'super_admin'::identity.user_role]));

create policy hbot_staff_read on treatment.hbot_sessions
  for select to authenticated
  using (identity.can_access_patient(patient_id));

create policy hbot_clinical_write on treatment.hbot_sessions
  for all to authenticated
  using (identity.can_access_patient(patient_id) and identity.has_role(array['physician'::identity.user_role,'super_admin'::identity.user_role,'wound_tech'::identity.user_role]))
  with check (identity.can_access_patient(patient_id) and identity.has_role(array['physician'::identity.user_role,'super_admin'::identity.user_role,'wound_tech'::identity.user_role]));
