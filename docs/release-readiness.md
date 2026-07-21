# Release readiness

Before production release:

- Apply and verify all Supabase migrations in the clinical project.
- Configure phone OTP and patient identity linking.
- Run staff, RLS, OPD, IPD, treatment, investigation, storage, and portal tests.
- Verify no service-role or private keys are browser-exposed.
- Confirm private buckets remain non-public.
- Run lint, build, and deployment smoke tests outside the OneDrive node_modules permission issue.
- Create a rollback plan for every production migration.
