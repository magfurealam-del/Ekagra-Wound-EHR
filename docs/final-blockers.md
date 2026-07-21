# Final external blockers

The repository implementation is complete for the current MVP scope. These actions must be performed in the connected environments:

1. Apply migrations `20260721000400` through `20260721000600` to the clinical Supabase project.
2. Configure Supabase phone OTP and approved SMS settings.
3. Link patient portal auth users through `identity.patient_portal_users`.
4. Run the full RLS and end-to-end test matrix against a development project.
5. Resolve the OneDrive `node_modules` EPERM issue, then run `pnpm lint` and `pnpm build`.
6. Deploy only after migration and smoke-test verification.
