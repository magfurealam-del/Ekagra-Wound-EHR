# Clinical test fixtures

Use a dedicated Supabase development project and create:

- One active physician profile and one active nurse profile.
- One clinic with memberships for both staff users.
- Patients with unique NIDs and no billing or finance references.
- A wound, OPD visit, draft assessment, photo, confirmation, and correction request.

Verify that a staff member cannot read a patient outside clinic access, a nurse cannot confirm an assessment, private photo paths do not produce public URLs, and confirmed assessments require a correction request rather than direct editing.
