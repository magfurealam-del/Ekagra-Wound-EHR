create policy clinical_form_drafts_owner on clinical.form_drafts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy operations_audit_staff_insert on operations.audit_log for insert to authenticated with check (actor_id = auth.uid() and identity.is_active_staff());
create policy operations_audit_staff_read on operations.audit_log for select to authenticated using (actor_id = auth.uid() or identity.has_role(array['super_admin'::identity.user_role]));
create policy investigations_alerts_access on investigations.alerts for all to authenticated using (identity.can_access_patient(patient_id)) with check (identity.is_active_staff());
create policy treatment_med_admin_access on treatment.medication_administrations for all to authenticated using (exists(select 1 from treatment.orders o where o.id=order_id and identity.can_access_patient(o.patient_id))) with check (identity.is_active_staff());
create policy treatment_procedures_access on treatment.procedures for all to authenticated using (identity.can_access_patient(patient_id)) with check (identity.is_active_staff());
revoke execute on function public.rls_auto_enable() from anon, authenticated;
