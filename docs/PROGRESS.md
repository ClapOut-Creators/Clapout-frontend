# ClapOut Platform — Progress Log

Living log of the landing ↔ platform ↔ backend integration work, so anyone
joining the project can catch up fast. Companion doc: `INTEGRATION-PLAN.md`
(same folder) holds the full API contract.

## The three repos

| Repo | What | Dev |
| ---- | ---- | --- |
| **Clapout-frontend** (this repo) | ClapOut Studio — Angular 22 + PrimeNG 22 + Tailwind v4 platform for creators/admins | `npm start` → http://localhost:4200 |
| **Clapout-backend** (sibling folder `../Clapout-backend`) | Node/Express 4 + TypeScript + Prisma API | `npm run dev` → http://localhost:4000, base path `/api/v1` |
| **ClapOut website** (`Personal projects/ClapOut website`) | clapoutcreators.com landing page — React 18 + Vite | `npm run dev` → http://localhost:5173 (or 5174 when 5173 is busy) |

## Done (as of 2026-09-01)

### Integration slice
- Backend API: public campaigns (list/detail), creator auth (JWT, bcrypt),
  campaign registrations. Statuses `UPCOMING | ACTIVE | CLOSED` with nullable
  budget/CPM/endDate for announced-but-not-open campaigns.
- Landing page campaigns list is **fed from the API** with a silent fallback to
  its static data (`src/data/campaigns.ts`) if the API is down. Campaign cards
  deep-link to the platform: `VITE_PLATFORM_URL/campaigns/:slug`.
- Platform public pages: `/campaigns`, `/campaigns/:slug` (upcoming countdown,
  hidden budgets as `₵—`, register CTA aware of the registration window).
- Creator flow: sign-up (**WhatsApp username + phone required**) → apply to a
  campaign (platform, account URL, terms) → creator dashboard with application
  statuses. Remember-me controls localStorage vs sessionStorage sessions.
- Password reset: forgot-password → **Resend** email → single-use hashed token
  (60 min) → reset page → sign-in. Enumeration-safe at both API and UI level.
- Shell: auth pages are chromeless; anonymous visitors get a top nav on public
  pages; signed-in users get the left side nav (mobile: top bar + drawer).
- Branding matched to the landing page: real logo, Poppins headings / SF Pro
  body, primary color ramp from brand orange `#EC612C`, PrimeUI Community
  license configured (watermark gone).

### Infrastructure
- Database: **Supabase Postgres** (project `acjxrhugfjlhawpyoaam`, eu-west-1)
  via Prisma. Transaction pooler for the app, session pooler for migrations.
  RLS enabled (no policies) on all tables so Supabase's public Data API can't
  reach them; `npm run db:secure` applies + verifies.
- Backend tests run against Supabase in a disposable `vitest` schema — they can
  never touch live data. 49 tests green.
- Secrets live in the backend's gitignored `.env` (Supabase URLs + password,
  JWT secret, Resend API key). `.env.example` documents every variable.

### Known caveats
- **Resend is in sandbox**: until a domain is verified at resend.com/domains,
  reset emails only deliver to the Resend account owner
  (clapoutcreators@gmail.com). Production needs the domain + a matching
  `MAIL_FROM`.
- PrimeNG license: free Community tier, renews (free) around Sept 2027.
- Password reset does not revoke already-issued JWTs (7-day expiry) — later
  hardening task.
- Landing repo has an unrelated untracked `pitch-deck/` folder (left alone).
- Bundle size: platform initial bundle is ~30–50 kB over the 700 kB *warning*
  budget (error budget 850 kB still clear).

## In progress

- **Admin section** (Figma file "Clapout", Admin page, nodes 175:719 /
  175:720 / 189:6412). Priorities set by Steve:
  1. **See registered clippers** — admin registrations tables (global and
     per-campaign) with contact + payment details.
  2. **Campaign creation wizard** → publish → campaign automatically appears
     on the landing page (published non-demo campaigns flow through the
     public API).
  - Adds `role ADMIN`, `/admin/*` endpoints, `DRAFT` campaign status (never
    public), seeded admin account (`ADMIN_EMAIL`/`ADMIN_SEED_PASSWORD` envs).
  - Out of scope for this phase: brands directory pages, payout processing,
    view verification.

## Not started / later
- Brand workspace, manual view verification + payout prep, content-link
  submission, CSV exports beyond the clippers table, profile editing,
  Supabase Storage for uploaded images (wizard currently stores image URLs /
  small data-URLs), domain-verified email, deployment wiring (all URLs are
  env-driven and ready).
