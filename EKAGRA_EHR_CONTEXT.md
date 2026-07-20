# Ekagra Wound EHR — Continuation Context

Use this file as the handoff context for future development chats.

## Project

Ekagra Wound Care EHR is a physician-first clinical web application for Ekagra Health. It supports OPD wound documentation, IPD daily workflows, treatment, investigations, referrals, patient portal access, auditability, and role-based clinical review.

Repository: https://github.com/magfurealam-del/Ekagra-Wound-EHR
Branch: `main`
Local workspace: `C:\Users\magfu\OneDrive\Documents\Wound EHR`

## Connected services

- Vercel team: Ekagra Dhanmondi
- Vercel project: `ekagra-wound-ehr`
- Vercel dashboard: https://vercel.com/ekagra-dhanmondi/ekagra-wound-ehr/deployments
- Supabase clinical project: `zhodknuzuyxzqgfjrghj`
- Supabase URL: `https://zhodknuzuyxzqgfjrghj.supabase.co`
- Supabase dashboard: https://supabase.com/dashboard/project/zhodknuzuyxzqgfjrghj
- Billing/finance project: separate and must never be connected to clinical tables.

Never commit service-role keys, AI keys, passwords, or private tokens. Only the Supabase publishable key may be browser-exposed.

## Current architecture

Next.js App Router + TypeScript + Tailwind CSS + Supabase Auth/Postgres/Storage + Vercel.

Current routes:

- `/`
- `/auth/staff/login`
- `/app`
- `/app/patients`
- `/app/patients/new`
- `/app/patients/demo`
- `/app/patients/demo/wounds/demo/assessment/new`
- `/app/ipd/admissions`
- `/app/referrals`
- `/app/reports`
- `/portal`

The UI is currently a staged MVP. The OPD assessment interface has interactive anatomy selection, local draft recovery, measurement validation, area calculation, and photo input. Supabase-backed clinical persistence is not yet wired into the form submit action.

## Supabase schema

Clinical schemas:

- `identity`
- `patients`
- `clinical`
- `treatment`
- `investigations`
- `referrals`
- `operations`

Applied migrations:

- `20260720000100_clinical_foundation.sql`
- `20260720000200_clinical_rls_storage.sql`
- `20260720000300_opd_longitudinal_wound_workflow.sql`

Key OPD tables:

- `clinical.opd_visits`
- `clinical.wounds`
- `clinical.wound_assessments`
- `clinical.wound_locations`
- `clinical.wound_photos`
- `clinical.wound_assessment_versions`
- `clinical.anatomy_map_versions`
- `clinical.clinical_signatures`
- `clinical.correction_requests`
- `clinical.attachments`

Private Storage buckets:

- `wound-photos`
- `clinical-documents`
- `consent-signatures`

RLS is enabled. Existing helper functions include `identity.is_active_staff()`, `identity.has_role(...)`, and `identity.can_access_patient(...)`.

## Clinical rules already clarified

### IPD

- One daily log per patient admission per Bangladesh calendar date.
- Late-night admissions create a partial first-day log.
- Nurses and doctors enter different sections.
- Entries may occur once, twice, three times daily, hourly, every 4 hours, every 6 hours, or custom.
- Frequency is configurable separately per section.
- One-off entries are allowed.
- Overdue and missed entries are flagged; missed entries require a reason.
- Nurse, Medical Officer, and physician/consultant review status must be tracked by both section and role.
- Medical Officer is a separate role.
- Attending physician means the Medical Officer; consultant is the doctor responsible for the admitted patient.
- Consultant sign-off is mandatory and may be retrospective with actual signing time recorded.
- Sections lock after signing; the complete daily log locks after required signatures.
- Corrections go to the consultant.

### OPD wounds

- An OPD visit may contain multiple wounds.
- Existing wounds are carried forward; new wound records may be created when clinically appropriate.
- A wound location change creates a new locked wound record.
- Previous confirmed assessment loads as the next draft.
- All roles may enter initial assessments: consultant/physician, Medical Officer, nurse, and wound technician.
- MO may confirm routine assessments; consultant confirmation is definitive.
- Only consultant can mark a wound healed.
- Reopened wounds become new wound records.
- Measurements are centimeters only: length, width, depth.
- Area is `length × width`.
- Percentage change is `((previous area - current area) / previous area) × 100`.
- Missing dimensions block submission; no estimation.
- At least one wound photo is required before confirmation.
- Camera capture and device upload are both required; multiple photos are allowed.
- Registration-level photo consent applies to future photos; repeat consent is not required each visit.
- Photos appear in the portal after confirmation.
- Body maps use predefined zones only: anterior/posterior body and dorsal/plantar foot drill-down.
- Body maps begin as clinician-review drafts.
- MVP wound types are fixed: diabetic foot, vascular, burn, post-infective, pressure injury/bed sore, traumatic, surgical, other.

## Current code structure

- `src/app/` routes and pages
- `src/app/app-shell.tsx` staff shell
- `src/app/auth/staff/login/page.tsx` Supabase email/password login
- `src/app/app/patients/demo/wounds/demo/assessment/new/page.tsx` OPD interaction shell
- `src/app/app/patients/demo/wounds/demo/assessment/new/anatomy-selector.tsx` body/foot selector
- `src/lib/supabase/browser.ts` browser client
- `src/lib/supabase/server.ts` server client
- `src/lib/supabase/middleware.ts` session refresh
- `middleware.ts` protects `/app/*`
- `src/lib/clinical/opd.ts` OPD validation and area calculation
- `supabase/migrations/` database migrations
- `.github/workflows/ci.yml` CI

## Latest implementation

Latest GitHub commit: `0480e5c`

Latest known deployment:

- URL: https://ekagra-wound-o0yhq91kk-ekagra-dhanmondi.vercel.app
- Inspector: https://vercel.com/ekagra-dhanmondi/ekagra-wound-ehr/Fd9kTU8j9QMCwgWFiNUwiY3BrAo6

Local validation currently passes:

- `pnpm lint`
- `pnpm build`

## Next implementation sequence

1. Load authenticated `identity.staff_profiles` and clinic memberships after login.
2. Add role-aware authorization helpers and navigation.
3. Create Supabase persistence functions for OPD visits, wounds, assessments, locations, and drafts.
4. Replace the demo save button with real authenticated draft persistence.
5. Add private Storage upload and signed URLs for wound photos.
6. Add MO and consultant confirmation workflows.
7. Add correction requests and immutable assessment version history.
8. Add real prior-assessment comparison and wound timeline.
9. Add clinician-reviewed SVG/JSON anatomy assets.
10. Add Playwright tests for auth, RLS, draft save, photo upload, confirmation, amendment, and anatomy selection.
11. Update the Obsidian vault after each meaningful schema, route, or deployment change.

## Development rules

- Inspect the local repo before editing.
- Preserve unrelated user changes.
- Use `apply_patch` for file edits.
- Run lint and build before pushing.
- Use the dedicated clinical Supabase project only.
- Apply reviewed migrations through Supabase tools.
- Never add billing tables or financial foreign keys.
- Do not use AI for diagnosis, staging, treatment selection, or autonomous escalation.
- Document changes in the Obsidian notes:
  - `Ekagra Wound EHR - Architecture Map.md`
  - `Ekagra Wound EHR - Codebase Register.md`
  - `Ekagra Wound EHR - Data Model and RLS.md`
  - `Ekagra Wound EHR - Implementation Ledger.md`

## Important known limitation

The application has staff login and route middleware, but a real staff profile/clinic membership lookup and authenticated form persistence still need implementation. Do not treat the current demo patient data as live clinical data.
