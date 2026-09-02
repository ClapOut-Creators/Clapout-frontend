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

### Brands + brand-first campaign creation (platform UI)

- **Brands section**: list (stat cards, search, table with logo/email/industry/phone/
  country/owner/status and view + delete with a `BRAND_IN_USE` guard, pagination), a
  3-step create/edit wizard (Brand Details -> Brand Location -> Primary Contact ->
  "Brand Saved!"), and a brand detail page (header with primary contact + account
  manager, Pause/Edit, stats, campaigns grid, recent registered clippers).
- **Campaign creation now starts from a brand**: the wizard's first step selects an
  existing brand or creates one inline; the old "Brand details" step is gone and
  `POST /admin/campaigns` sends `brandId`. `?brandId=` preselects.
- **1:1 Figma pass** over the admin screens (campaigns list/detail, registrations
  table, both wizards, sign-in) against the exported node specs, on a shared kit:
  wizard modal shell, page header, stat card, brand logo tile, compact campaign card.
- Contract: `Brand`/`BrandDetail`/`BrandInput`, `PublicCampaign.brandId`,
  `CampaignDraftInput.brandId`, and the five `/admin/brands` endpoints.

### Clipper surfaces + public landing chrome

- **Public pages wear the landing chrome**: anonymous visitors get the floating
  pill navbar and the dark footer (with the CLAPOUT watermark) instead of the
  studio top bar, so `/campaigns` reads as part of clapoutcreators.com. Signed-in
  users keep the rail. `/terms` and `/privacy` placeholders added.
- **Campaigns list + detail rebuilt** to the clipper design, exact at 1728 and
  clean at 402/380, on a new shared public campaign card (banner, brand chip,
  "Nd ago", platform glyphs, spent/total, participants, CPM, budget meter).
- **Create-account rebuilt**: country-code select + local number joined into one
  international phone string (so `wa.me` links work), required terms checkbox
  linking to /terms. Sign-in re-checked against the newer frame.
- **Clipper dashboard rebuilt**: greeting, "Finish setting up" checklist wired to
  real state (socials via `PATCH /me`, WhatsApp community, first campaign),
  stat cards, and the joined-campaigns panel with its empty state.

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

### Live verification of the brands phase (2026-09-02)

- Screenshots of every admin route at the Figma viewport (1728×1048) were compared
  against the exports in `docs/design/figma/` over three rounds; all reviewed screens
  (campaigns list, both wizards, campaign detail, brands list, brand detail,
  registrations, sign-in) now match the designs structurally and in type/spacing.
- End-to-end on the live database: brand created through the 3-step wizard →
  campaign created under it through the brand-first wizard → published → appeared on
  clapoutcreators.com within seconds (then removed again so only E-WALE is listed).
- Fixes that fell out of the pass: closed/draft campaigns no longer show "N days
  left"; money renders with two decimals; `budgetSpent` is `0` (not null) whenever a
  budget is announced, so meters start empty; the landing card never renders a full
  bar for a missing value; WhatsApp handles in clipper tables open `wa.me` chats.
- The admin JWT minted for verification lives only in agent transcripts; changing
  the seeded admin password (or rotating `JWT_SECRET`) invalidates it.

## In progress

- Nothing mid-flight. The admin section passed its full live pass on
  2026-09-01: admin sign-in routes to `/admin/dashboard` (creators keep their
  dashboard), stats render from real data, the clippers table shows live
  registrations and its per-row status change persists (Submitted → Accepted
  verified), a creator hitting `/admin/*` lands on `/forbidden`, and a
  campaign created through the 8-step wizard ("ClapOut QA Test") published
  straight onto the landing page's campaign list with no extra step. The QA
  campaign is still live in the dev database — close or delete it whenever.
- Out of scope so far and still open: brands directory pages, payout
  processing, view verification.

## Not started / later

- Brand workspace, manual view verification + payout prep, content-link
  submission, CSV exports beyond the clippers table, profile editing,
  Supabase Storage for uploaded images (wizard currently stores image URLs /
  small data-URLs), domain-verified email, deployment wiring (all URLs are
  env-driven and ready).
