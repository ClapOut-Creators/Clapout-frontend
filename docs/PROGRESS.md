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

### Live verification of the clipper phase (2026-09-02)

- Screenshots at 1728×1048 and 402×900 of the clipper dashboard, sign-in,
  create-account, public campaigns list and campaign detail were compared against
  `docs/design/figma-clippers/`; all match the designs structurally and in spacing.
- End to end on the live database: created an account through the new form (phone
  stored as `+233209876543` from the +233 selector + local number), landed on the
  dashboard, saved two social links through the dialog (checklist row flips to
  "2 accounts linked"), community link opens the WhatsApp invite, "Submit content"
  is disabled (coming soon). Synthetic `@example.com` test creators were removed
  afterwards.
- Product decisions: no faked trend pills; Earned/Views/Submissions are honest zeros
  until those features exist; verified badge shows for every brand (no flag yet).

### Desktop scale, mobile overflow, the landing chrome and Share (2026-09-02)

A production review turned up three things, plus two follow-ons.

**Desktop was ~25% too big.** Every screen carries the Figma 1728px pixel
values, which read as zoomed-in beside clapoutcreators.com at the same window
width. `src/styles.css` now applies `body { zoom: 0.8 }` from 1024px — the same
step the landing site takes, so the two stay in lockstep. `zoom` reflows rather
than scaling a bitmap, so nothing overflows and text stays crisp. Two
consequences had to be handled:

- Viewport units are not divided by `zoom`, so `h-screen` / `min-h-screen` /
  `min-h-svh` are grown back by `1 / --ui-scale`. The sticky admin rail measures
  a full 900px at a 900px viewport again.
- PrimeNG positions body-appended overlays from `getBoundingClientRect()`
  (visual px) and writes the result back as inline `px`, which the body zoom
  then scaled a second time — every panel landed 20% short of its trigger.
  Cancelling the zoom on the positioned box and re-applying it to the box's
  content puts them back. Verified in Chromium: both popovers, the side-nav
  tooltip, the select overlay, the toast, the dialog + mask, the wizard modal
  and the sticky rail. The datepicker is `[inline]` and never overlays.

**Mobile was broken on real phones.** `/campaigns/e-wale-clipping` measured
408px wide on a 390px iPhone 13 because the campaign's requirements note holds a
52-character WhatsApp invite that never wraps, so iOS zoomed the whole page out.
Fixed by a `body { overflow-wrap: break-word }` default plus `.co-user-text`
(`overflow-wrap: anywhere`) on brand-authored blocks, `overflow-x: clip` on
html/body, and a new `shared/text/linkified-text` that renders bare URLs in the
requirements note as real `target="_blank"` links. All twelve mobile routes now
report `scrollWidth === clientWidth` with no element painting past the viewport.
Gutters are 16px everywhere (the signed-in shell's 34px drops below `sm`), and
touch devices get a 40px minimum on the shared button primitives.

**The footer and navbar are the landing site's.** Both ported from
`ClapOut website/src/components/layout/` — the footer's four columns
(Explore / Guides / Legal / Contact), copyright rule and giant wordmark, and the
navbar's white pill with its full nav from `md` up (it used to collapse to a
hamburger at `lg`, so a 1000px window showed a phone menu beside the landing's
full nav). Every destination is an absolute clapoutcreators.com URL except
Campaigns, which stays on the platform.

**Share.** `shared/public/share-campaign-button` shares
`${origin}/campaigns/${slug}` — the OS share sheet where `navigator.share`
exists, otherwise clipboard + a "Link copied" toast, with a dialog holding the
URL when the clipboard is unavailable. It sits on the public campaign detail
(beside Back), on each non-draft admin campaign card and detail header, and on
the wizard's "Campaign Published!" screen.

**Clipper dashboard joined campaigns** now use the public campaign card, with
the registration status tag overlaid on the banner and the applied date in the
meta row. `Registration.campaign` is typed as a partial `PublicCampaign` and
normalised by `registrationCampaign()`, so it renders correctly both before and
after the backend starts embedding the full campaign body.

### Content submissions and partnership inquiries (2026-09-02)

The workflow's last two gaps closed in one slice: clippers can now hand in a
posted clip, and the brand inquiries the landing page collects land somewhere an
admin can work them.

**Clipper side.** `/creator/campaigns/:slug/submit` loads the campaign and the
clipper's registration for it, then either shows the form or an explanatory panel
— not registered (with the apply CTA), still under review, rejected, or a
campaign that is not ACTIVE. The form takes the post link, a screenshot, and
optional views / posted date / caption / reviewer note behind a confirmation
checkbox. Two checks run before the round trip: `httpUrlValidator`, and a
client-side copy of the contract's host table (`core/util/platform-url.ts`), so a
YouTube link pasted into a TikTok registration is answered with "That doesn't
look like a TikTok link" rather than a 422. Server codes still map to inline copy
(`REGISTRATION_NOT_ACCEPTED`, `SUBMISSIONS_CLOSED`,
`POST_URL_PLATFORM_MISMATCH`, `DUPLICATE_SUBMISSION`, `VALIDATION`).

**Screenshots are resized in the browser.** `Submission.screenshotUrl` travels in
the JSON body and the API caps it at 700 000 characters, so a phone screenshot
had to shrink client-side: `shared/forms/image-resize.ts` draws the image onto a
canvas at most 1600px on its longest edge and encodes JPEG at 0.82, dropping the
quality and then the edge until it fits. A 900×1600 PNG came out at 67 KB in the
live pass. The wizards' existing `readAsDataURL` helpers only cap size, which
would have rejected most real screenshots, so this is a new helper rather than a
reuse.

`/creator/submissions` lists every clip with the totals from `GET /me/stats`
(Submissions, Pending, Verified views, Earned) and a campaign picker that skips
straight to the submit page when only one campaign has accepted the clipper. The
dashboard's tiles now come from the same endpoint, checklist step 5 completes as
soon as one clip exists (its button is disabled with "Available once a campaign
accepts you" until then), and every ACCEPTED joined-campaign card grows a
"Submit clip" pill in a footer row under it. On the public campaign detail, an
accepted clipper on an ACTIVE campaign sees "Submit content" where the register
CTA was.

**Admin side.** `shared/admin/submissions-table` mirrors `clippers-table`:
server-side search and campaign/status filters, CSV export of exactly the rows on
screen, and columns for clipper (with the `wa.me` link), campaign, post link,
screenshot thumbnail, claimed → verified views, payout, status and date. The
review dialog carries the full screenshot, an open-post button, contact + payout
details, the clipper's caption and note, a verified-views input prefilled with
the claim, a live payout preview (`verifiedViews / 1000 × cpm`, or a "no CPM"
warning), a note to the clipper, and the state-aware actions — Under review,
Approve, Reject, Mark paid (APPROVED only, behind a confirm naming the amount)
and Undo to Submitted. `/admin/submissions` adds Pending / Approved awaiting
payment / Paid cards over it, and the campaign detail gets a Submissions section
with its own Export beside the clippers one.

`/admin/inquiries` is the landing form's queue: New / Contacted / Converted
cards, status + search filters, a table (company, contact with `mailto:`/`tel:`,
promoting, budget, timeline, content type, an email-delivered tick, status,
received) and a right drawer with every field, the admin note, the status select
and "Create brand from inquiry". That hands `?inquiryId=` to the brand wizard,
which prefills name ← company, website ← link and the primary contact from the
inquiry, then PATCHes the inquiry to CONVERTED with the new `brandId` after a
successful create — best effort, so a failure there shows a notice on the success
screen instead of losing the brand.

Side nav gains Submissions for clippers, and Submissions + Inquiries for admins.

### Live verification of the submissions phase (2026-09-02)

- Full round trip on the live database with the demo clipper and the E-WALE
  campaign: submitted a clip with a generated fake analytics screenshot (resized
  to 67 KB), reviewed it as admin with 11,800 verified views → payout preview and
  the frozen `payoutAmount` both read ₵ 118.00, marked it Paid (the campaign's
  `budgetSpent` moved 0 → 118), then undid it to Submitted (`budgetSpent` back to 0) and withdrew it as the clipper. Nothing test-shaped is left in the database
  beyond the demo clipper's ACCEPTED registration for E-WALE, which is
  intentionally kept.
- The wrong-platform check, the duplicate/closed/not-accepted error mapping, the
  withdraw confirm, the campaign picker and the brand-wizard prefill were all
  exercised through the UI. Screenshots at 1728×1048, 1000×800 and iPhone 13
  (390px) show no horizontal overflow on any of the new screens, and the console
  is clean on all of them.
- No partnership inquiry was created: the contract has no delete endpoint, so the
  admin queue was verified against the real (empty) state plus a Playwright route
  mock for the populated table and drawer.

### Brand invites — self-serve brand onboarding (2026-09-03)

Brands have no portal yet, so onboarding one meant an admin retyping everything
the brand had already told them. An admin now generates a single-use link and
sends it to the brand's representative, who fills in the same three-step wizard
themselves.

**The wizard's three steps are now shared.** `shared/brands/brand-form.ts` owns
Brand Details (logo included), Brand Location and Primary Contact — the typed
form, the per-step validation gate, the logo upload and its `data:` URL cap, and
`value()` / `patch()`. `features/admin/brand-wizard` keeps the shell, the step
navigation, the admin submit target and the "Brand Saved!" screen and projects
its own Back/Continue footer into the shared form; the public page does the same
with a single "Save brand". The host element is `display: contents` so the
`<form>` stays a direct child of whatever column laid it out: screenshots of all
three admin steps at 1728 are byte-identical before and after the refactor, and
`?inquiryId=` prefill plus the CONVERTED hand-off still work.

**`/brand/onboard/:token`** is public, lazy and guard-free — the token in the
link is the whole credential. `app.ts` widens the chromeless check that already
covered `/auth`, so the page renders with no nav, rail or footer. It handles
loading, an invalid link (404), used / revoked / expired (each explained in the
brand's own terms, with a "Contact ClapOut" mailto), the prefilled wizard, and
"Brand saved! The ClapOut team will be in touch to plan your first campaign." —
with no admin links on it. `brandInviteCompleteFailure()` maps the failures:
`409 BRAND_EXISTS` renders under the brand-name field on step 1, the
`410 INVITE_USED | INVITE_REVOKED | INVITE_EXPIRED` family swaps the page to the
matching dead-link screen (a link can die while the rep is typing), 429 asks
them to wait a few minutes, and 422 shows what the API objected to.

**Admin side.** `/admin/brands` gains an "Invite a brand" secondary button beside
"Create brand", opening `shared/admin/brand-invite-dialog.ts`: brand name,
contact, email, an international phone reusing sign-up's country-code select,
website, expiry (7 / 14 / 30 days, default 14) and an internal note — all
optional, because the invite is a hint and the brand fills in the real thing. On
success the same dialog becomes the link state: the full link in a read-only
input with Copy, "Send on WhatsApp" when a phone was given, and Done. The API
only ever returns the token; `core/util/brand-invite-link.ts` composes
`${window.location.origin}/brand/onboard/${token}`, so no URL base is needed
server side. Below the brand list, `shared/admin/brand-invites-table.ts` lists
every invite (brand hint, contact, status tag, sent, expires, the brand it
created) with a status filter and per-row Copy link / Revoke / Delete — Revoke
and Copy only while PENDING, Delete never while the invite still owns a brand,
both behind a confirm, all with toasts. The inquiry drawer gets "Send brand
invite" next to "Create brand from inquiry", opening the same dialog prefilled
from the inquiry (company → brand name, contact, phone, email, link → website)
and re-reading the inquiry afterwards, since issuing the invite moves a NEW one
to CONTACTED.

`AdminStats` gains the optional `pendingBrandInvites`, and the invite status
helpers (Pending / Completed / Revoked / Expired) sit with the other label/tone
pairs in `core/util/campaign-format.ts`.

### Live verification of brand invites (2026-09-03)

- Full round trip on the live database: one invite created through the dialog
  ("TEST invite — delete me"), its link opened in a browser context with no
  ClapOut session, the three steps completed as "ZZ Test Brand (delete me)", and
  the brand appeared in `/admin/brands` with the invite showing Completed and
  linking to it. Re-opening the spent link showed "This link has already been
  used" naming the brand. A second invite was revoked through the UI (its link
  then read "This link was cancelled") and deleted; the test brand was deleted
  via `DELETE /admin/brands/:id` and the first invite deleted through the UI's
  Delete action, which only appears once the brand is gone. Nothing is left
  behind — `GET /admin/brand-invites` is empty and the brand list is back to its
  two real rows.
- The inquiry drawer's "Send brand invite" was opened against the one real
  partnership request to confirm the prefill, then cancelled: firing it would
  have moved a real lead from NEW to CONTACTED, which is not ours to do. That
  inquiry is untouched.
- Screenshots at 1728×1048, 1000×800 and iPhone 13 (390px) cover the brands page
  with the invites section, both dialog states, the inquiry drawer, and the
  public page's three steps, used-link and success states. No horizontal
  overflow at any width and the console is clean on every screen. The two
  smaller widths use a Playwright-stubbed 201 for the dialog's link state and
  the public success screen, so the screenshot set cost the database exactly one
  invite and one brand, both since removed.

## In progress

- Nothing mid-flight. The admin section passed its full live pass on
  2026-09-01: admin sign-in routes to `/admin/dashboard` (creators keep their
  dashboard), stats render from real data, the clippers table shows live
  registrations and its per-row status change persists (Submitted → Accepted
  verified), a creator hitting `/admin/*` lands on `/forbidden`, and a
  campaign created through the 8-step wizard ("ClapOut QA Test") published
  straight onto the landing page's campaign list with no extra step. The QA
  campaign is still live in the dev database — close or delete it whenever.
- Out of scope so far and still open: brands directory pages, automated view
  verification, and the payout transfer itself (admins mark clips Paid by hand
  once the MoMo transfer has gone out).

## Not started / later

- Brand workspace, automated view verification, payout transfers, profile
  editing,
  Supabase Storage for uploaded images (wizard currently stores image URLs /
  small data-URLs), domain-verified email, deployment wiring (all URLs are
  env-driven and ready).
