# ClapOut Landing ↔ Platform Integration Plan

Author: Fable 5 (planning) · Implementation: Opus 5 sub-agents · Date: 2026-08-31

## Goal

Wire the public landing page (clapoutcreators.com, React/Vite, at
`C:\Users\Steve\Documents\Personal projects\ClapOut website`) to the real
ClapOut Studio platform (Angular 22, at
`C:\Users\Steve\Documents\Personal projects\clapout platform\Clapout-frontend`)
through a new Node backend:

1. New Node backend repo serves the campaigns API (plus auth + campaign registration).
2. Landing page campaigns list is fetched from that API (static data becomes the error fallback).
3. Clicking a campaign card on the landing page redirects to the **platform's** campaign
   details page (public route) instead of the landing's own detail page.
4. "Register for this campaign" on the platform takes the visitor through platform
   sign-up → campaign application → lands on their creator dashboard.

## Repos / workstreams

| # | Repo | Path | Agent |
| - | ---- | ---- | ----- |
| A | **Clapout-backend** (new) | `clapout platform\Clapout-backend` | Opus |
| B | **Clapout-frontend** (platform) | `clapout platform\Clapout-frontend` | Opus |
| C | **ClapOut website** (landing) | `ClapOut website` | Opus |

All three build against the API contract below; none blocks another.

## Ports & env

- Backend dev: **http://localhost:4000**
- Platform dev: **http://localhost:4200** (ng serve, already running)
- Landing dev: **http://localhost:5173** (vite)
- Landing env: `VITE_API_BASE_URL` (default `http://localhost:4000/api/v1`),
  `VITE_PLATFORM_URL` (default `http://localhost:4200`)
- Platform env: `apiBaseUrl` in Angular environments (`http://localhost:4000/api/v1`)
- Backend env: `PORT=4000`, `JWT_SECRET`, `CORS_ORIGINS`
  (defaults include `http://localhost:5173`, `http://localhost:4200`,
  `https://clapoutcreators.com`, `https://www.clapoutcreators.com`)

## API contract (v1)

Base path `/api/v1`. JSON. Errors: `{ "error": { "code": string, "message": string } }`
with proper HTTP status. Auth: `Authorization: Bearer <jwt>` (7-day expiry).

### Public campaigns

- `GET /public/campaigns` → `200 { "data": PublicCampaign[] }`
- `GET /public/campaigns/:slug` → `200 { "data": PublicCampaign }` | `404`

```ts
interface PublicCampaign {
  slug: string;                 // 'e-wale-clipping'
  title: string;                // 'E-WALE Clipping | ₵2k Budget | ₵20.0 CPM'
  demo: boolean;                // demo/dummy campaigns; landing filters these out
  brand: {
    name: string;               // 'E-wale tech'
    logoUrl: string | null;     // absolute URL
    logoBg: string;             // '#0B51F0'
    logoFit: 'cover' | 'contain';
  };
  // UPCOMING: announced but not open yet — clients show a countdown to startDate
  // and hide money fields (rendered as '₵—') when they are null.
  status: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
  // ACTIVE && startDate <= now && (endDate == null || now < endDate)
  registrationOpen: boolean;
  registrationCount: number;   // creators registered, all statuses (for the card)
  platforms: ('tiktok' | 'x' | 'facebook' | 'instagram' | 'youtube')[];
  currency: string;             // '₵' or '$'
  cpm: number | null;           // 20; null = not announced yet
  budgetSpent: number | null;   // 217.9
  budgetTotal: number | null;   // 2000
  description: string;
  category: string;             // 'Product'
  startDate: string;            // ISO date or datetime '2026-09-01T11:00:00'
  endDate: string | null;       // ISO datetime; null = not announced yet
  avgReviewTime: string;        // '1d'
  tags: string[];
  bannerUrl: string | null;
  requirementsNote: string | null;
  requirementsDocUrl: string | null;
  resourceLabel: string | null;
  resourceUrl: string | null;
  updatedAt: string;            // ISO datetime
}
```

Image URLs in seed data point at the live landing site
(`https://clapoutcreators.com/campaigns/e-wale-logo.png`, `.../e-wale-banner.png`,
`https://clapoutcreators.com/clients/<file>` for the demo brands).

### Auth (creators only in this slice)

- `POST /auth/sign-up` `{ email, password, fullName, whatsapp, phone }` (whatsapp = WhatsApp
  username, e.g. `@loverboy_12`; both contact fields REQUIRED as of 2026-09-01)
  → `201 { token, user: Me }` | `409 EMAIL_TAKEN` | `422 VALIDATION`
- `POST /auth/sign-in` `{ email, password }` → `200 { token, user: Me }` | `401 INVALID_CREDENTIALS`
- `GET /me` (auth) → `200 { user: Me }`
- `PATCH /me` (auth) partial `{ fullName?, whatsapp?, phone?, socials?, payout? }` → `200 { user: Me }`

```ts
interface Me {
  id: string;
  email: string;
  role: 'CREATOR';
  fullName: string;
  whatsapp: string | null;
  phone: string | null;
  socials: { url: string }[];
  payout: { method: 'MTN_MOMO' | 'TELECEL_CASH' | 'AT_MONEY'; accountNumber: string; accountName: string } | null;
  createdAt: string;
}
```

Password: bcrypt, min 8 chars. Email normalized lowercase.

### Password reset (added 2026-09-01, emails via Resend)

- `POST /auth/forgot-password` `{ email }` → **always** `200 { ok: true }` (no user
  enumeration; `422 VALIDATION` only for a malformed email). If the account exists,
  a single-use reset link is emailed: `${RESET_URL_BASE}?token=<raw token>`.
  Tokens: 32 random bytes hex, stored **hashed** (sha256) in a `PasswordResetToken`
  table with 60-minute expiry; issuing a new token invalidates older unused ones.
  Mail failures are logged server-side but still return `200`.
- `POST /auth/reset-password` `{ token, password }` → `200 { ok: true }` |
  `400 INVALID_RESET_TOKEN` (unknown/expired/used) | `422 VALIDATION` (password < 8).
  On success the token is marked used and the new bcrypt hash saved. The client then
  routes the user to sign-in.
- Backend env: `RESEND_API_KEY`, `MAIL_FROM` (default `ClapOut <onboarding@resend.dev>`),
  `RESET_URL_BASE` (default `http://localhost:4200/auth/reset-password`).
- Platform routes: `/auth/forgot-password` (email form → confirmation state) and
  `/auth/reset-password?token=…` (new password + confirm → success → sign-in link).

### Registrations (campaign applications)

- `POST /registrations` (auth) `{ campaignSlug, platform, accountUrl, note? }`
  → `201 { data: Registration }`
  | `404 CAMPAIGN_NOT_FOUND` | `409 ALREADY_REGISTERED` | `422 REGISTRATION_CLOSED`
- `GET /me/registrations` (auth) → `200 { data: Registration[] }` (newest first)

```ts
interface Registration {
  id: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED';
  platform: 'tiktok' | 'x' | 'facebook' | 'instagram' | 'youtube';
  accountUrl: string;   // creator's account/profile URL on that platform
  note: string | null;
  createdAt: string;
  campaign: {           // embedded summary for dashboard rendering (mirrors the campaign row,
    slug: string; title: string; brandName: string; brandLogoUrl: string | null;
    brandLogoBg: string; currency: string; cpm: number | null; endDate: string | null;
    status: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
  };
}
```

One registration per (user, campaign). New registrations start `SUBMITTED`.

### Admin (added 2026-09-01 — Figma: Admin page, nodes 175:719, 175:720, 189:6412)

`User.role` becomes `'CREATOR' | 'ADMIN'`. Sign-up always creates CREATOR. An admin
is seeded by `db:seed` from env: `ADMIN_EMAIL` (default `admin@clapoutcreators.com`)
+ `ADMIN_SEED_PASSWORD` (default `ClapoutAdmin-2026!`, dev only — override in prod).
All `/admin/*` endpoints require Bearer + role ADMIN → else `403 FORBIDDEN`.

Campaign `status` gains `'DRAFT'`. Public endpoints NEVER return DRAFT campaigns.
Publishing sets `UPCOMING` when `startDate` is in the future, else `ACTIVE` — so a
published campaign appears on the landing page automatically (`demo: false`).

- `GET /admin/stats` → `200 { data: { publishedCampaigns, totalCreators, totalBrands,
  newRegistrations7d, awaitingReview, registrationActivity: { date: 'YYYY-MM-DD',
  count: number }[] } }` (activity = last 21 days of registrations, zero-filled)
- `GET /admin/registrations?campaignSlug=&brandId=&status=&search=` → `200 { data: AdminRegistration[] }`
  (`brandId` scopes to the registrations of that brand’s campaigns; all filters combine)
  newest first. `AdminRegistration = { id, status, platform, accountUrl, note, createdAt,
  creator: { id, fullName, email, whatsapp, phone, socials, payout }, campaign: { slug,
  title, brandName } }` — this powers the "Registered Clippers" tables (top priority).
- `PATCH /admin/registrations/:id` `{ status }` (SUBMITTED|UNDER_REVIEW|ACCEPTED|REJECTED)
  → `200 { data: AdminRegistration }` | `404`
- `GET /admin/campaigns` → `200 { data: PublicCampaign[] }` including DRAFT
- `POST /admin/campaigns` — creates a DRAFT. Body: `{ title, slug?, demo?, brand:
  { name, logoUrl?, logoBg?, logoFit? }, description, category, currency, cpm?,
  budgetTotal?, startDate?, endDate?, platforms, tags?, bannerUrl?, requirementsNote?,
  requirementsDocUrl?, resourceLabel?, resourceUrl? }` → `201 { data }`. Slug generated
  from title when omitted (kebab, uniquified). Image fields accept https URLs or
  `data:` URLs (bump express json limit to 2mb; client caps images ~500 KB).
- `PATCH /admin/campaigns/:slug` (partial, same fields) → `200 { data }` | `404`
- `POST /admin/campaigns/:slug/publish` → validates title, description, category,
  currency, cpm, budgetTotal, startDate, non-empty platforms → `422 INCOMPLETE`
  listing missing fields, else status := future-start ? UPCOMING : ACTIVE.
- `POST /admin/campaigns/:slug/close` → status CLOSED.

Platform admin routes (guarded by role): `/admin/dashboard`, `/admin/registrations`,
`/admin/campaigns`, `/admin/campaigns/new` (stepper wizard per Figma: banner+title →
details → budget → timeline → platforms → requirements → brand → preview →
publish/save-draft → success), `/admin/campaigns/:slug` (detail + Registered Clippers
+ publish/close). Payout processing & view verification stay out of scope this phase.

### Brands (added 2026-09-02 — Figma node 189:6412; campaigns are owned by a brand)

Every campaign belongs to exactly one Brand. Creating a campaign now starts by
selecting an existing brand or creating one inline (the wizard's first step);
the old "Brand details" wizard step is gone — brand identity comes from the Brand.

```ts
interface Brand {
  id: string;
  slug: string;                 // kebab of name, unique
  name: string;                 // "E-wale tech"
  logoUrl: string | null;       // https:// or data:image/ (<= ~700 KB)
  logoBg: string;               // '#0B51F0'
  logoFit: 'cover' | 'contain';
  website: string | null;       // "Website/social link"
  industry: string | null;      // "Tech"
  country: string | null;       // "Ghana"
  city: string | null;          // "Accra"
  contactName: string | null;   // primary contact
  contactEmail: string | null;  // business email
  contactPhone: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  campaignCount: number;        // computed
  createdAt: string; updatedAt: string;
}
interface BrandDetail extends Brand {
  stats: { totalCampaigns: number; totalRegistrations: number; revenue: number };
  campaigns: PublicCampaign[];  // all statuses incl. DRAFT, newest first
}
```

Admin endpoints (Bearer + role ADMIN; 403 otherwise):

- `GET /admin/brands?search=` → `200 { data: Brand[] }` (name asc)
- `POST /admin/brands` `{ name, logoUrl?, logoBg?, logoFit?, website?, industry?,
  country?, city?, contactName?, contactEmail?, contactPhone? }` → `201 { data: Brand }`
  (`422 VALIDATION`; `409 BRAND_EXISTS` on a duplicate name, case-insensitive)
- `GET /admin/brands/:id` → `200 { data: BrandDetail }` | `404 BRAND_NOT_FOUND`
- `PATCH /admin/brands/:id` (partial; `status` included) → `200 { data: Brand }`
- `DELETE /admin/brands/:id` → `204` | `409 BRAND_IN_USE` when campaigns reference it

Campaign changes:

- `Campaign.brandId` (FK, required). `POST /admin/campaigns` takes `brandId` instead
  of an inline `brand` block (`422` when missing/unknown). `PATCH` may change `brandId`.
- `PublicCampaign.brand` keeps its shape `{ name, logoUrl, logoBg, logoFit }` but is
  served from the Brand relation; `PublicCampaign` gains `brandId: string`.
- Migration: create one Brand per existing distinct `brandName` (E-wale tech →
  "e-wale-tech", copying logo fields) and link the campaigns; then the inline
  `brandName/brandLogo*` columns are dropped.
- Publish gate: `brandId` present (replaces the `brand.name` check).

### Misc

- `GET /health` → `200 { ok: true }`

## Workstream A — backend (new repo `Clapout-backend`)

- Node + TypeScript, Express 4, Prisma + SQLite (`file:./dev.db`), zod validation,
  jsonwebtoken, bcryptjs, cors. `npm run dev` (tsx watch), `build`, `start`,
  `db:push` + `db:seed`, `test` (vitest + supertest covering the contract).
- Prisma models: `User`, `Campaign`, `Registration` (+ JSON columns for socials/payout/platforms/tags).
  Campaign rows carry brand fields inline (brandName/logoUrl/logoBg/logoFit) — a separate
  Brand table is future work for the admin build, not this slice.
- Seed: port all 6 campaigns from the landing repo's `src/data/campaigns.ts`
  verbatim (e-wale real + 5 demo), numeric fields as numbers, absolute image URLs.
- `git init` + initial commit. README with run instructions.

## Workstream B — platform (Angular, `Clapout-frontend`)

Follow the repo's CLAUDE.md constraints (standalone default, no `standalone: true`,
no OnPush declaration, PrimeNG + Tailwind v4 + design tokens, signals, typed
repositories, lazy routes). New routes:

- `/campaigns` — public discovery list (cards match landing card content: brand, status,
  days-left, platforms, paid out/goal progress, CPM)
- `/campaigns/:slug` — public campaign detail (mirrors the landing detail layout:
  title, description w/ expand, tags, CPM/views, dates, banner, budget progress card,
  category/dates/platforms/last-updated table, requirements + resources,
  **Register CTA** — disabled "Registration closed" when `!registrationOpen`)
- `/auth/sign-up`, `/auth/sign-in` — with `returnUrl` query param support
- `/creator/campaigns/:slug/apply` — guarded application form (platform select from the
  campaign's platforms, account URL, optional note, terms checkbox)
- `/creator/dashboard` — guarded; welcome header, list of the creator's registrations
  with status tags + campaign summaries, profile-completion hint (socials/payout),
  link back to discovery
- Redirect `/` → `/campaigns` for now.

Infra: `AuthService` (signals, token in localStorage, `/me` rehydration),
functional interceptor adding Bearer token, `creatorGuard` redirecting to
`/auth/sign-in?returnUrl=…`, HTTP repositories for campaigns/auth/registrations,
environments with `apiBaseUrl`. Register CTA: authed → apply page; anonymous →
sign-up with returnUrl to the apply page. After successful application →
`/creator/dashboard` with a success toast.

Loading/empty/error/retry states on every page per repo CLAUDE.md.

## Workstream C — landing (`ClapOut website`)

- `src/lib/api.ts`: `fetchCampaigns()` against `VITE_API_BASE_URL`, mapping
  `PublicCampaign` → existing `Campaign` type (format `paidOut`/`goal`/`cpm` strings
  from numeric fields + currency, keep `slug/platforms/status/…`).
- `CampaignsPage`: fetch on mount → loading skeleton → API data; on failure fall back
  silently to the static `data/campaigns.ts` list (never a broken page).
- `CampaignCard`: when a `platformUrl` context is configured, card href becomes
  `${VITE_PLATFORM_URL}/campaigns/${slug}` (normal full-page navigation, same tab).
  The internal `#/campaigns/:slug` detail page stays as dead-code fallback.
- `.env.example` documenting `VITE_API_BASE_URL` + `VITE_PLATFORM_URL`; sensible
  localhost defaults in code so `npm run dev` works with zero setup.
- Do not restyle anything.

## Integration verification (after agents finish)

1. Backend: `npm run db:push && npm run db:seed && npm run dev`; smoke-test endpoints.
2. Landing dev server: campaigns list renders from API (check network tab), card click
   lands on `http://localhost:4200/campaigns/e-wale-clipping`.
3. Platform: detail page renders; Register → sign-up → apply → dashboard shows the
   registration as Submitted. Closed campaign shows disabled CTA.
4. Kill API → landing still renders via static fallback.

## Out of scope (this slice)

Admin/brand workspaces, payouts, email verification, password reset, content
submission, view verification, production deployment wiring (envs are ready for it).
