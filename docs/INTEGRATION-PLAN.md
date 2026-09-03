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
  // The FULL PublicCampaign (brand block, brandId, effective status,
  // registrationOpen, registrationCount, platforms, money, dates, tags,
  // bannerUrl, requirements/resources, updatedAt) so the dashboard can reuse
  // the discovery card, plus three legacy flat brand keys kept for one release.
  campaign: PublicCampaign & {
    brandName: string;          // @deprecated — use campaign.brand.name
    brandLogoUrl: string | null; // @deprecated — use campaign.brand.logoUrl
    brandLogoBg: string;        // @deprecated — use campaign.brand.logoBg
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

### Submissions (added 2026-09-02 — clippers submit posted clips for manual verification)

A submission is one posted clip from one ACCEPTED registration. Clippers submit the
public post link plus a screenshot (proof of the post and/or its analytics); admins
verify views by hand, approve with a verified view count (payout = verifiedViews / 1000
× cpm, rounded to 2 dp and frozen at approval time) and later mark it PAID once the
MoMo transfer is done. Marking PAID adds `payoutAmount` to `Campaign.budgetSpent`
(moving away from PAID subtracts it again, floored at 0), so the "paid out" bar on the
landing page and the platform tracks real payouts. Automated verification and the
payment itself stay manual/out of scope.

```ts
type SubmissionStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';

interface Submission {
  id: string;
  registrationId: string;
  status: SubmissionStatus;
  platform: Platform;            // copied from the registration at submit time
  postUrl: string;               // https URL of the published clip
  screenshotUrl: string;         // data:image/* (client-resized, <= ~700 KB) — proof
  caption: string | null;        // optional title/caption of the clip
  claimedViews: number | null;   // views the clipper reports when submitting
  postedAt: string | null;       // 'YYYY-MM-DD' the clip went live
  note: string | null;           // anything for the reviewer
  verifiedViews: number | null;  // admin-entered on approval
  payoutAmount: number | null;   // verifiedViews / 1000 * cpm, 2 dp, frozen at approval
  reviewNote: string | null;     // rejection reason / message to the clipper
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  campaign: {
    slug: string; title: string; brandName: string; brandLogoUrl: string | null;
    brandLogoBg: string; currency: string; cpm: number | null; avgReviewTime: string;
  };
}

interface AdminSubmission extends Submission {
  creator: {
    id: string; fullName: string; email: string; whatsapp: string | null;
    phone: string | null; payout: Me['payout'];
  };
  registration: { id: string; platform: Platform; accountUrl: string };
}

interface CreatorStats {
  campaigns: number;             // registrations, any status
  acceptedCampaigns: number;     // registrations with status ACCEPTED
  submissions: number;           // all statuses
  pendingSubmissions: number;    // SUBMITTED | UNDER_REVIEW
  verifiedViews: number;         // sum of verifiedViews over APPROVED | PAID
  earned: { currency: string; amount: number }[]; // sum payoutAmount over APPROVED | PAID, per currency
  paid: { currency: string; amount: number }[];   // PAID only, per currency
}
```

Creator endpoints (Bearer):

- `POST /submissions` `{ registrationId, postUrl, screenshotUrl, caption?, claimedViews?, postedAt?, note? }`
  → `201 { data: Submission }`
  | `404 REGISTRATION_NOT_FOUND` (also when the registration belongs to someone else)
  | `422 REGISTRATION_NOT_ACCEPTED` (registration is not ACCEPTED)
  | `422 SUBMISSIONS_CLOSED` (campaign's effective status is not ACTIVE)
  | `422 POST_URL_PLATFORM_MISMATCH` (URL host is not the registration's platform:
    tiktok → tiktok.com; youtube → youtube.com | youtu.be; instagram → instagram.com;
    facebook → facebook.com | fb.watch; x → x.com | twitter.com; any subdomain such as
    `www.`, `vm.`, `m.` is fine)
  | `409 DUPLICATE_SUBMISSION` (same postUrl already submitted for this campaign, by anyone;
    compare after trimming, lower-casing the host and dropping the query string/fragment)
  | `422 VALIDATION` (not an http(s) URL, screenshotUrl not `data:image/*` or > 700 000
    chars, claimedViews not an integer ≥ 0, postedAt not `YYYY-MM-DD`, caption > 200,
    note > 2000)
- `GET /me/submissions?registrationId=` → `200 { data: Submission[] }` newest first
- `DELETE /me/submissions/:id` → `204` while SUBMITTED; `409 SUBMISSION_LOCKED` once it
  has been touched by a reviewer; `404 SUBMISSION_NOT_FOUND` when it is not the caller's
- `GET /me/stats` → `200 { data: CreatorStats }`

Admin endpoints (Bearer + role ADMIN):

- `GET /admin/submissions?campaignSlug=&brandId=&registrationId=&status=&search=`
  → `200 { data: AdminSubmission[] }` newest first; filters combine; `search` matches
  creator full name / email and the postUrl (case-insensitive contains)
- `PATCH /admin/submissions/:id` `{ status, verifiedViews?, reviewNote? }`
  → `200 { data: AdminSubmission }` | `404 SUBMISSION_NOT_FOUND`
  - `APPROVED` requires `verifiedViews` (integer ≥ 0, or an existing value on the row)
    and sets `payoutAmount = round(verifiedViews / 1000 * campaign.cpm, 2)`;
    `422 CAMPAIGN_CPM_MISSING` when the campaign has no cpm
  - `PAID` requires the row to be APPROVED or already PAID → else `422 NOT_APPROVED`;
    entering PAID adds `payoutAmount` to `Campaign.budgetSpent` (null → 0 first)
  - leaving PAID for any other status subtracts `payoutAmount` from `budgetSpent` (min 0)
  - `REJECTED`, `UNDER_REVIEW`: keep verifiedViews/payoutAmount as given or previously set
  - `SUBMITTED`: allowed (undo), clears `reviewedAt`; every other transition sets
    `reviewedAt = now`; `reviewNote` overwrites when present (empty string → null)
- `GET /admin/stats` gains `pendingSubmissions` (SUBMITTED | UNDER_REVIEW count) and
  `newInquiries` (see next section) — additive, existing fields unchanged

Platform routes: `/creator/campaigns/:slug/submit` (guarded; needs an ACCEPTED
registration for that campaign — other states get an explanatory panel),
`/creator/submissions` (every clip the clipper submitted + a "Submit a clip" campaign
picker), `/admin/submissions` (review table + review dialog with the screenshot, the post
link, verified views, payout preview, note, Approve / Reject / Under review / Mark paid),
plus a Submissions section on `/admin/campaigns/:slug`. Dashboard stats come from
`GET /me/stats`.

### Partnership inquiries (added 2026-09-02 — landing "Partnership Inquiry" form → admin)

The landing form keeps emailing clapoutcreators@gmail.com through Web3Forms **and** now
also posts the same fields to the backend, so admins see every brand inquiry at
`/admin/inquiries`. The landing sends the email first, then calls the backend with
`emailDelivered` reflecting whether Web3Forms accepted it; the visitor sees the success
state if either call succeeded, and the error message only when both failed.

```ts
type InquiryStatus = 'NEW' | 'CONTACTED' | 'CONVERTED' | 'CLOSED';

interface PartnershipInquiry {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string;                 // international, e.g. '+233201234567'
  promoting: string;             // "What are you promoting"
  link: string;                  // website / socials / app link (free text, not validated as a URL)
  contentType: string;           // 'TikTok' | 'Instagram Reels' | 'YouTube Shorts' | 'Mixed' (free text)
  timeline: string;              // 'ASAP' | 'Within 2 weeks' | 'Within a month' | 'Flexible' (free text)
  budget: string;                // 'GH₵2,000 – 5,000' … (free text)
  notes: string | null;
  source: 'landing';
  emailDelivered: boolean;       // Web3Forms accepted the notification email
  status: InquiryStatus;
  adminNote: string | null;
  brandId: string | null;        // set once converted into a Brand
  createdAt: string;
  updatedAt: string;
}
```

- `POST /public/partnership-inquiries` (no auth)
  `{ name, email, company?, phone, promoting, link, contentType, timeline, budget, notes?, emailDelivered?, website? }`
  → `201 { data: { id, createdAt } }` | `422 VALIDATION` | `429 RATE_LIMITED`.
  `website` is a honeypot: when non-empty the API answers `201` with a random id and
  stores nothing. Limits: name/company ≤ 120, email ≤ 160 (must be an email),
  phone ≤ 40, promoting/link ≤ 500, contentType/timeline/budget ≤ 80, notes ≤ 4000;
  `emailDelivered` defaults to false. Best-effort in-memory per-IP limit of 10 posts per
  10 minutes.
- `GET /admin/partnership-inquiries?status=&search=` → `200 { data: PartnershipInquiry[] }`
  newest first (`search`: name / email / company / promoting, case-insensitive contains)
- `GET /admin/partnership-inquiries/:id` → `200 { data }` | `404 INQUIRY_NOT_FOUND`
- `PATCH /admin/partnership-inquiries/:id` `{ status?, adminNote?, brandId? }` → `200 { data }`
  (`422 BRAND_NOT_FOUND` for an unknown brandId; a `brandId` sent without a `status`
  moves NEW/CONTACTED → CONVERTED; `adminNote` empty string → null)

Platform: `/admin/inquiries` (stat cards New / Contacted / Converted, status + search
filters, table, detail drawer with every field, admin note and status, and a "Create
brand from inquiry" action → `/admin/brands/new?inquiryId=` prefilled with
company → name, link → website, name/email/phone → primary contact; saving that brand
patches the inquiry to CONVERTED with the new `brandId`).

### Brand invites (added 2026-09-02 — self-serve brand onboarding link)

Until brands have their own portal, an admin generates a single-use link and sends it to
the brand's representative (WhatsApp/email — the admin sends it, the API sends nothing).
The link opens a public, chromeless page on the platform where the rep completes the
same three-step brand wizard admins use (Brand Details → Brand Location → Primary
Contact), prefilled with whatever the admin already knew. Completing it creates the
Brand (ACTIVE, exactly as `POST /admin/brands` would) and marks the invite used.

The link is `${platform origin}/brand/onboard/${token}`; the platform composes it from
its own origin (`window.location.origin`), so no URL base env is needed on the API.

```ts
// EXPIRED is computed: a PENDING invite whose expiresAt is in the past. Never stored.
type BrandInviteStatus = 'PENDING' | 'COMPLETED' | 'REVOKED' | 'EXPIRED';

interface BrandInvite {                 // admin view
  id: string;
  token: string;                        // 32 random bytes, base64url — the secret in the link
  status: BrandInviteStatus;
  brandName: string | null;             // prefill hints shown to the rep
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;          // international, e.g. '+233…'
  website: string | null;
  note: string | null;                  // internal, never shown to the rep
  inquiryId: string | null;             // partnership inquiry this invite was sent for
  brandId: string | null;               // brand created through this invite
  brand: { id: string; name: string; slug: string } | null;
  createdBy: { id: string; fullName: string };
  expiresAt: string;
  completedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PublicBrandInvite {           // what the rep's page sees — no token echo, no internals
  status: BrandInviteStatus;
  brandName: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  expiresAt: string;
  completedBrandName: string | null;    // set once COMPLETED
}
```

Admin endpoints (Bearer + role ADMIN):

- `POST /admin/brand-invites`
  `{ brandName?, contactName?, contactEmail?, contactPhone?, website?, note?, expiresInDays?, inquiryId? }`
  → `201 { data: BrandInvite }`. `expiresInDays` 1–90, default 14. Limits: brandName/
  contactName ≤ 120, contactEmail ≤ 160 (email when present), contactPhone ≤ 40,
  website ≤ 2000, note ≤ 2000. `422 INQUIRY_NOT_FOUND` for an unknown inquiryId; when
  the inquiry is NEW it moves to CONTACTED.
- `GET /admin/brand-invites?status=&search=` → `200 { data: BrandInvite[] }` newest first
  (`status` accepts the computed EXPIRED too; `search`: brandName / contactName /
  contactEmail, case-insensitive contains)
- `GET /admin/brand-invites/:id` → `200 { data }` | `404 INVITE_NOT_FOUND`
- `POST /admin/brand-invites/:id/revoke` → `200 { data }` (PENDING → REVOKED) |
  `409 INVITE_NOT_PENDING` for anything else
- `DELETE /admin/brand-invites/:id` → `204` | `409 INVITE_HAS_BRAND` while `brandId` is set
  (delete the brand first — `Brand` → invite is `onDelete: SetNull`); lets admins clean up
  mistaken or test invites
- `GET /admin/stats` gains `pendingBrandInvites` (PENDING and not expired) — additive

Public endpoints (no auth; the token is the credential; best-effort per-IP limits like
the inquiry form — 60 reads and 10 completions per 10 minutes → `429 RATE_LIMITED`):

- `GET /public/brand-invites/:token` → `200 { data: PublicBrandInvite }` |
  `404 INVITE_NOT_FOUND`. A used, revoked or expired invite still answers 200 with that
  status so the page can explain what happened.
- `POST /public/brand-invites/:token/complete` — body is `BrandInput` without `status`
  (`name` required; the same validation as `POST /admin/brands`, logo as https or
  data:image/ ≤ 700 KB) → `201 { data: { brand: { id, name, slug }, invite: PublicBrandInvite } }`
  | `404 INVITE_NOT_FOUND` | `410 INVITE_USED` | `410 INVITE_REVOKED` | `410 INVITE_EXPIRED`
  | `409 BRAND_EXISTS` (name clash, case-insensitive — the page tells the rep to contact
  ClapOut) | `422 VALIDATION`. The brand is created ACTIVE and the invite is marked
  COMPLETED (`brandId`, `completedAt`) in ONE transaction whose invite update is
  conditional on `status = 'PENDING'`, so a double submit can never create two brands.
  When the invite carries an `inquiryId`, that inquiry becomes CONVERTED with the brandId.

Platform:

- Public route `/brand/onboard/:token`, chromeless like the auth pages (logo, "Set up
  your brand on ClapOut", no nav/footer/sign-in). States: loading; invalid link;
  used / revoked / expired (friendly explanation + "Contact ClapOut" mailto
  clapoutcreators@gmail.com); the wizard prefilled from the invite; success ("Brand saved!
  The ClapOut team will be in touch to plan your first campaign.") with no admin links.
  `BRAND_EXISTS` renders inline on the details step.
- The brand wizard's three steps become a shared form component used by BOTH the admin
  wizard (`/admin/brands/new`, `/:id/edit` — must stay 1:1 with Figma) and the public
  page; only the shell, the submit target and the success screen differ.
- `/admin/brands`: an "Invite a brand" button beside "Create brand" opens a dialog (brand
  name, contact name / email / phone, website, expiry 7 / 14 / 30 days, internal note);
  on success the dialog shows the link with Copy and, when a phone is present, "Send on
  WhatsApp" (`https://wa.me/<digits>?text=<prefilled message with the link>`). A "Brand
  invites" section on the same page lists invites (brand, contact, status tag, sent,
  expires, created-brand link, Copy link, Revoke with confirm), filterable by status.
- The inquiry drawer (`/admin/inquiries`) gets "Send brand invite", which opens that same
  dialog prefilled from the inquiry (company → brand name, contact, phone, email, link →
  website, `inquiryId`), so the admin never retypes what the brand already sent.

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

Automated view verification, the payout transfer itself (admins mark submissions PAID
by hand after sending MoMo), email verification. Admin/brand workspaces, password
reset, content submission and partnership inquiries were added in later slices — see
the dated sections above.
