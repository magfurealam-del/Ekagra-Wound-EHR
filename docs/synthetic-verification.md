# Synthetic verification guide

The demo seed creates only synthetic records in the clinical Supabase project. It does not use real patient data and it never prints or stores the chosen demo password.

## Test personas

| Persona | Login email | What to verify |
|---|---|---|
| Consultant physician | `consultant@ekagra.test` | Patient chart, consultant IPD plan, OPD review and confirmation |
| Medical officer | `mo@ekagra.test` | Routine clinical entry and handoff to consultant |
| Nurse | `nurse@ekagra.test` | Vitals, nursing note, scheduled daily entry |
| Wound technician | `wound.tech@ekagra.test` | Wound measurements, photos and draft documentation |
| Clinic admin | `clinic.admin@ekagra.test` | Clinic-scoped operational access |

All accounts use the password supplied through `EKAGRA_DEMO_PASSWORD` when the seed command runs.

## Forms currently visible

- Patient registration: identity, NID, phone, date of birth, sex, clinic access and consent status.
- OPD wound assessment: wound type, measurements, calculated area, prior confirmed comparison, clinical note, photo consent and image upload.
- IPD admission: patient, ward/cabin/bed and active admission episode.
- IPD daily chart: nurse observations (pulse, BP, SpO2, temperature), nursing note, MO complaints/assessment/plan, consultant diagnosis/plan, monitoring frequency and daily clinical date.

## Form sections still being built

Admission H&P, safety screening, structured wound-type fields, intake/output, medication administration, signatures and locking, discharge, document upload and lab extraction verification.

## Seed command

Run from the canonical checkout after setting the three environment variables in the current terminal:

```powershell
pnpm demo:seed
```

The seed script refuses a missing password, missing service-role key, or any Supabase URL other than `zhodknuzuyxzqgfjrghj`.
