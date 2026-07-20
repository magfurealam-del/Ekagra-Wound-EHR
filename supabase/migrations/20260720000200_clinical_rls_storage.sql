-- Clinical authorization baseline. Billing is intentionally absent.
create or replace function identity.is_active_staff()
returns boolean language sql stable security definer set search_path = identity, pg_temp
as $$ select exists (select 1 from identity.staff_profiles where id = auth.uid() and status = 'active') $$;

create or replace function identity.has_role(allowed identity.user_role[])
returns boolean language sql stable security definer set search_path = identity, pg_temp
as $$ select exists (select 1 from identity.staff_profiles where id = auth.uid() and status = 'active' and role = any(allowed)) $$;

create or replace function identity.can_access_patient(p_patient_id uuid)
returns boolean language sql stable security definer set search_path = identity, patients, pg_temp
as $$ select identity.is_active_staff() and exists (select 1 from patients.clinic_access ca join identity.staff_clinic_memberships scm on scm.clinic_id=ca.clinic_id and scm.staff_id=auth.uid() where ca.patient_id=p_patient_id and (ca.expires_at is null or ca.expires_at>now())) $$;

revoke all on function identity.is_active_staff() from public;
revoke all on function identity.has_role(identity.user_role[]) from public;
revoke all on function identity.can_access_patient(uuid) from public;
grant execute on function identity.is_active_staff() to authenticated;
grant execute on function identity.has_role(identity.user_role[]) to authenticated;
grant execute on function identity.can_access_patient(uuid) to authenticated;

create policy identity_clinics_staff on identity.clinics for select to authenticated using (identity.is_active_staff());
create policy identity_profiles_self on identity.staff_profiles for select to authenticated using (id=auth.uid() or identity.has_role(array['super_admin'::identity.user_role]));
create policy identity_memberships_self on identity.staff_clinic_memberships for select to authenticated using (staff_id=auth.uid() or identity.has_role(array['super_admin'::identity.user_role]));
create policy patient_records_access on patients.records for all to authenticated using (identity.can_access_patient(id) or identity.has_role(array['super_admin'::identity.user_role])) with check (identity.is_active_staff());
create policy patient_clinic_access on patients.clinic_access for all to authenticated using (identity.can_access_patient(patient_id) or identity.has_role(array['super_admin'::identity.user_role])) with check (identity.is_active_staff());
create policy patient_consents_access on patients.consents for all to authenticated using (identity.can_access_patient(patient_id)) with check (identity.is_active_staff());
create policy encounter_access on clinical.encounters for all to authenticated using (identity.can_access_patient(patient_id)) with check (identity.can_access_patient(patient_id));
create policy wound_access on clinical.wounds for all to authenticated using (identity.can_access_patient(patient_id)) with check (identity.can_access_patient(patient_id));
create policy assessment_access on clinical.wound_assessments for all to authenticated using (exists (select 1 from clinical.wounds w where w.id=wound_id and identity.can_access_patient(w.patient_id))) with check (identity.is_active_staff());
create policy photo_access on clinical.wound_photos for all to authenticated using (exists (select 1 from clinical.wound_assessments a join clinical.wounds w on w.id=a.wound_id where a.id=wound_assessment_id and identity.can_access_patient(w.patient_id))) with check (identity.is_active_staff());
create policy observation_access on clinical.observations for all to authenticated using (exists (select 1 from clinical.encounters e where e.id=encounter_id and identity.can_access_patient(e.patient_id))) with check (identity.is_active_staff());
create policy ipd_form_access on clinical.ipd_forms for all to authenticated using (exists (select 1 from clinical.encounters e where e.id=encounter_id and identity.can_access_patient(e.patient_id))) with check (identity.is_active_staff());
create policy orders_physician_only on treatment.orders for all to authenticated using (identity.can_access_patient(patient_id) and identity.has_role(array['physician'::identity.user_role,'super_admin'::identity.user_role])) with check (identity.has_role(array['physician'::identity.user_role,'super_admin'::identity.user_role]));
create policy document_access on investigations.documents for all to authenticated using (identity.can_access_patient(patient_id)) with check (identity.is_active_staff());
create policy lab_access on investigations.lab_results for all to authenticated using (identity.can_access_patient(patient_id)) with check (identity.is_active_staff());
create policy referral_access on referrals.records for all to authenticated using (identity.can_access_patient(patient_id)) with check (identity.is_active_staff());

insert into storage.buckets (id,name,public) values ('wound-photos','wound-photos',false),('clinical-documents','clinical-documents',false),('consent-signatures','consent-signatures',false) on conflict (id) do update set public=false;
