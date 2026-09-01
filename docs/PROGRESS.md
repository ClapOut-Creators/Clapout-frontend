# ClapOut Platform — Progress Log

Living log of the landing ↔ platform ↔ backend integration work, so anyone
joining the project can catch up fast. Companion doc: `INTEGRATION-PLAN.md`
(same folder) holds the full API contract.

## The three repos

| Repo                                                      | What                                                                                | Dev                                                               |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Clapout-frontend** (this repo)                          | ClapOut Studio — Angular 22 + PrimeNG 22 + Tailwind v4 platform for creators/admins | `npm start` → http://localhost:4200                               |
| **Clapout-backend** (sibling folder `../Clapout-backend`) | Node/Express 4 + TypeScript + Prisma API                                            | `npm run dev` → http://localhost:4000, base path `/api/v1`        |
| **ClapOut website** (`Personal projects/ClapOut website`) | clapoutcreators.com landing page — React 18 + Vite                                  | `npm run dev` → http://localhost:5173 (or 5174 when 5173 is busy) |

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

### Admin section (platform UI)

- **Registered Clippers** table — one reusable component, used across all
  campaigns at `/admin/registrations` and scoped to a single campaign on its
  detail page. Shows name, email, WhatsApp, phone, the social account (linked),
  payout method/number/name, status and applied date; per-row status change
  (Submitted → Under review → Accepted/Rejected) with a toast, server-side
  search + campaign/status filters, and CSV export of exactly the rows shown.
- **Campaign creation wizard** (`/admin/campaigns/new`, same route reused for
  `/:slug/edit`): banner+title → description+category → currency/budget/CPM →
  timeline → platforms → requirements+resources → brand → preview, then Save
  draft or Publish, ending on a "Campaign published!" state. Publishing a
  campaign makes it appear on the landing page automatically.
- **Admin dashboard**: 5 stat cards, a 21-day registration activity bar chart
  (chart.js), and the 3 most recently updated campaigns.
- **Admin campaigns index**: status tabs (All/Draft/Upcoming/Active/Closed,
  shareable via `?status=`), search, and a campaign card grid.
- **Admin campaign detail**: brand/status header, edit + publish/close actions,
  public-style detail, performance overview, and that campaign's clippers.
- Auth: `role ADMIN`, `adminGuard` (anonymous → sign-in with `returnUrl`,
  signed-in non-admins → `/forbidden`), role-aware side nav. Campaigns gained a
  `DRAFT` status that the public API never returns.

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
- Bundle size: platform initial bundle is ~65 kB over the 700 kB _warning_
  budget (error budget 850 kB still clear).

## In progress

- **Admin section — needs a live pass.** The UI is built and green on build /
  lint / tests / format, and the `/admin/*` endpoints answer `401` correctly
  when unauthenticated, but every flow behind an admin session is still
  unverified against real data: the non-admin → `/forbidden` branch, the
  clippers table with rows in it, the row status PATCH, and the wizard's
  save-draft → publish round trip (including publish's `422 INCOMPLETE`
  handling). Sign in as `admin@clapoutcreators.com` and walk them.
- Out of scope this phase and still open: brands directory pages, payout
  processing, view verification.

## Not started / later

- Brand workspace, manual view verification + payout prep, content-link
  submission, CSV exports beyond the clippers table, profile editing,
  Supabase Storage for uploaded images (wizard currently stores image URLs /
  small data-URLs), domain-verified email, deployment wiring (all URLs are
  env-driven and ready).
