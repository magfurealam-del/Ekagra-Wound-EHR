# Ekagra Wound Care EHR

Physician-first wound-care EHR MVP for Ekagra Health.

## Development

```bash
pnpm install
pnpm dev
```

The initial UI is a navigable architecture prototype. Clinical persistence is defined in `supabase/migrations/` and deployed only to the dedicated clinical Supabase project `zhodknuzuyxzqgfjrghj`.

## Connected services

- GitHub: https://github.com/magfurealam-del/Ekagra-Wound-EHR
- Vercel: https://vercel.com/ekagra-dhanmondi/ekagra-wound-ehr/deployments
- Supabase clinical project: https://supabase.com/dashboard/project/zhodknuzuyxzqgfjrghj

Billing data is intentionally excluded from this Supabase project.

## Deployment

Production uses the protected GitHub `main` branch and Vercel project `ekagra-wound-ehr`. Configure only the two public Supabase variables in Vercel. Service-role and AI keys remain unset until server-side features are implemented.
