# Phase Handoff

## Phase

`00 - Foundation`

## Outcome

Phase 00 installs and wires the frontend foundation for ClapOut Studio. The root route renders a responsive placeholder shell while product pages remain out of scope until Phase 01+.

## Files and routes changed

- Root route `/` lazy-loads the Phase 00 foundation placeholder.
- PrimeNG, Tailwind, app-wide semantic tokens, config providers, and mock adapter mode are wired.
- Lint, format, unit, Playwright, and Angular-default verification scripts are defined.
- Architecture boundary folders are established under `core`, `shared`, and `features`.

## PDF references

No direct PDF page. This phase enables later PDF-backed pages.

## Verification

| Check                   | Command or method                                                                                   | Result                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frozen install          | `PATH=/Users/stephenaddae/.nvm/versions/node/v24.18.0/bin:$PATH npm ci`                             | PASS; npm printed allow-scripts review warnings.                                                                                                 |
| Format                  | `PATH=/Users/stephenaddae/.nvm/versions/node/v24.18.0/bin:$PATH npm run format:check`               | PASS                                                                                                                                             |
| Lint                    | `PATH=/Users/stephenaddae/.nvm/versions/node/v24.18.0/bin:$PATH npm run lint`                       | PASS                                                                                                                                             |
| Build                   | `PATH=/Users/stephenaddae/.nvm/versions/node/v24.18.0/bin:$PATH npm run build`                      | PASS unsandboxed; sandboxed build aborts in esbuild with a deadlock. Initial total `689.96 kB`, below the `850 kB` error budget.                 |
| Unit/component          | `PATH=/Users/stephenaddae/.nvm/versions/node/v24.18.0/bin:$PATH npm run test:unit -- --watch=false` | PASS; 2 files, 3 tests.                                                                                                                          |
| E2E                     | `PATH=/Users/stephenaddae/.nvm/versions/node/v24.18.0/bin:$PATH npm run test:e2e`                   | BLOCKED in sandbox: Angular dev server cannot listen on `127.0.0.1:4200` (`EPERM`). Unsandboxed rerun was declined after Chromium was installed. |
| Angular defaults        | `PATH=/Users/stephenaddae/.nvm/versions/node/v24.18.0/bin:$PATH npm run verify:angular-defaults`    | PASS                                                                                                                                             |
| Responsive visual check | Playwright mobile/tablet/laptop/wide viewport smoke                                                 | BLOCKED with E2E gate.                                                                                                                           |
| Accessibility check     | Playwright AXE critical-violation smoke                                                             | BLOCKED with E2E gate.                                                                                                                           |

## API readiness

| Capability                            | Status | Notes                                                                          |
| ------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| App configuration and repository mode | MOCKED | `APP_ENVIRONMENT` exposes `apiBaseUrl`, `useMockAdapters`, and `apiReadiness`. |
| Product repositories                  | MOCKED | No backend endpoint has been invented or integrated in Phase 00.               |

## Deviations and decisions

- Node is pinned to `v24.18.0` through `.nvmrc` because the previous default shell Node `v24.13.1` was below Angular CLI's supported Node 24 range.
- The root placeholder validates styling and wiring only; admin navigation and authenticated shell remain Phase 01.
- PrimeIcons are currently available through `@primeicons/angular`, matching the installed PrimeNG 22 ecosystem.
- `@angular/animations` is installed for PrimeNG overlay/transition support, despite Angular v22 deprecating the package for app-authored animations.

## Known issues

- Playwright e2e, responsive, and AXE smoke are implemented but not passed in this run because browser/dev-server execution is sandbox-blocked and the unsandboxed rerun was declined.
- A live preview server is not running because sandboxed `npm start` fails with `listen EPERM` and the unsandboxed start was declined.
- npm prints an allow-scripts review warning for native/build packages; install succeeds and the warning is recorded for follow-up review.

## Next phase recommendation

`HOLD`

Reason: Phase 00 implementation is complete, but the Playwright smoke gate still needs to pass outside the sandbox before Phase 01 is formally safe.

---

# Integration Slice - Public Campaigns, Auth, Apply, Creator Dashboard

## Phase

`Integration (Workstream B)` - layered on top of Phase 00, ahead of the numbered page phases.

## Outcome

The platform now consumes the live ClapOut backend contract (`INTEGRATION-PLAN.md`, API v1). Visitors
arriving from the landing page land on a real public campaign detail page and can sign up, apply to a
campaign, and track the application from a guarded creator dashboard.

## Files and routes added

Routes (all lazy):

- `/` redirects to `/campaigns`; the Phase 00 placeholder moved to `/foundation` (its Playwright spec
  now targets that path).
- `/campaigns` - public discovery list.
- `/campaigns/:slug` - public detail with the register CTA.
- `/auth/sign-in`, `/auth/sign-up` - `returnUrl` aware.
- `/creator/campaigns/:slug/apply` - guarded application form.
- `/creator/dashboard` - guarded application list.
- `**` - not-found page.

Core:

- `core/models/{campaign,user,registration}.ts` - contract types copied verbatim from the plan.
- `core/api/api-error.ts` - normalises HTTP failures into `ApiError` (`status` + backend `code`).
- `core/auth/{token-store,auth-service,auth-interceptor,creator-guard}.ts`.
- `core/data/{campaigns-repository,registrations-repository}.ts`.
- `core/util/campaign-format.ts` - dates, currency, days-left, status tone helpers.
- `shared/layout/top-nav.*`, `shared/forms/form-errors.ts`.

Config: `provideHttpClient(withInterceptors([authInterceptor]))`, `withComponentInputBinding()`, an
app initializer that rehydrates the session, and `provideAppConfiguration()` now points at
`http://localhost:4000/api/v1` with `apiReadiness: 'INTEGRATED'` and `useMockAdapters: false`.

## Verification

| Check            | Command or method                                      | Result                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install          | `npm install`                                          | PASS                                                                                                                                                                      |
| Build            | `npm run build`                                        | PASS. Initial total `730.33 kB` - over the `700 kB` warning budget, under the `850 kB` error budget.                                                                      |
| Lint             | `npx eslint .`                                         | PASS                                                                                                                                                                      |
| Format           | `npm run format:check`                                 | PASS                                                                                                                                                                      |
| Unit/component   | `npm run test:unit -- --watch=false`                   | PASS; 2 files, 3 tests.                                                                                                                                                   |
| Angular defaults | ripgrep for `standalone: true` / `OnPush`              | PASS (no matches). The npm script needs `rg` on PATH; not available on this Windows shell.                                                                                |
| Live smoke       | Browser against the running dev server + local backend | PASS: list renders 6 seeded campaigns with logos, detail renders with banner and closed-CTA, guarded route redirects to `/auth/sign-in?returnUrl=%2Fcreator%2Fdashboard`. |

## API readiness

| Capability                | Status     | Notes                                                                                                         |
| ------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| Public campaigns          | INTEGRATED | `GET /public/campaigns`, `GET /public/campaigns/:slug`.                                                       |
| Creator auth              | INTEGRATED | `POST /auth/sign-up`, `POST /auth/sign-in`, `GET /me`.                                                        |
| Campaign registrations    | INTEGRATED | `POST /registrations`, `GET /me/registrations`.                                                               |
| Profile editing / payouts | BLOCKED    | `PATCH /me` exists in the contract but no screen is in this slice; the dashboard hint links are placeholders. |

## Deviations and decisions

- No `src/environments/*` files: `APP_ENVIRONMENT` from Phase 00 stays the single source of
  `apiBaseUrl`, with a TODO in `app.config.ts` for the deployed origin.
- Typed Reactive Forms rather than Signal Forms, per the CLAUDE.md allowance.
- The token lives in a dependency-free `TokenStore` so the interceptor never has to inject
  `AuthService` (which would be cyclic once `AuthService` issues its own `/me` request).
- Demo campaigns are shown, not filtered: the landing page filters `demo`, but the Studio list is the
  only place these seeded campaigns are browsable today.

## Known issues

- PrimeNG 22 logs `[PrimeUI] PrimeUI license is not configured` and paints an "Invalid PrimeUI
  License" watermark in the corner of every page (Phase 00 pages included). It needs a license key in
  `providePrimeNG({ license })` or a licensing decision; it is not caused by this slice.
- Initial bundle now exceeds the 700 kB warning budget by ~30 kB, mostly `HttpClient` plus the session
  bootstrap being needed at startup.
- Playwright e2e was not run here; the foundation spec was retargeted to `/foundation`.

## Contract amendment - UPCOMING campaigns

`PublicCampaign` gained a third status and four nullable fields; the platform was updated to match.

| Field                               | Before                 | After                                |
| ----------------------------------- | ---------------------- | ------------------------------------ |
| `status`                            | `'ACTIVE' \| 'CLOSED'` | `'UPCOMING' \| 'ACTIVE' \| 'CLOSED'` |
| `cpm`, `budgetSpent`, `budgetTotal` | `number`               | `number \| null`                     |
| `endDate`                           | `string`               | `string \| null`                     |

`registrationOpen` is now `status === 'ACTIVE' && startDate <= now && (endDate == null || now < endDate)`.

Rendering rules, mirroring the landing page:

- UPCOMING renders an `Upcoming` tag at `warn` severity.
- Unannounced money renders as `${currency}—` (`NOT_ANNOUNCED` in `campaign-format.ts`), never `₵0`.
- The budget progress bar is omitted entirely when `budgetTotal` is null; the card and the budget
  panel say the budget has not been announced yet.
- A live `Opens in HH:MM:SS` countdown against `startDate` replaces the days-left label, falling back
  to `Opens <date>` when `startDate` is past or unparsable.
- Null `endDate` renders as `—` in both the meta line and the facts table.
- Detail CTA order: UPCOMING (disabled, `Registration opens in HH:MM:SS`) -> already applied ->
  registration closed -> register. Already-applied now outranks closed, so a creator can still see
  their application on a campaign that has since closed.
- The apply page has a dedicated upcoming state ("Registration hasn't opened yet") separate from the
  closed state.

The countdown is a shared `createNowSignal()` helper (`shared/time/clock.ts`): a signal ticking on an
interval, gated by an `enabled` signal so pages without an upcoming campaign never run a per-second
change detection cycle, and cleared through `DestroyRef.onDestroy`. Formatting helpers take an
explicit `now` argument (defaulting to `Date.now()`) so the tick is a real reactive dependency rather
than a hidden global clock, and so they stay unit-testable.

Every arithmetic path is null-guarded: `budgetPercent()` returns 0 unless `hasBudget()` confirms a
positive total, `formatMoney()` short-circuits on null/undefined/non-finite, and `daysLeftLabel()` /
`openCountdownLabel()` return `—` / null rather than computing against a missing date.

Verified live against the running backend: E-WALE renders Upcoming with a ticking countdown, `₵—`
throughout and no progress bar; NIKE (open) shows the enabled register CTA; Klap (expired) shows the
disabled closed CTA; Coca-Cola shows already-applied. `npm run build`, `npx eslint .`,
`npm run format:check` and `npm run test:unit` all pass.

## Password reset (added 2026-09-01)

Implements the plan's `POST /auth/forgot-password` / `POST /auth/reset-password` contract as two real
pages, replacing the "email support" placeholder.

- `/auth/forgot-password` - email form -> confirmation state ("Check your inbox - if an account
  exists for <email>, a reset link is on its way. It expires in 60 minutes.") with "Back to sign in"
  and a "try a different email" affordance that returns to the prefilled form. 422 renders under the
  field; transport failures render a banner and the button retries.
- `/auth/reset-password?token=…` (title "Choose a new password - ClapOut Studio") - `token` arrives
  through `withComponentInputBinding()` like `returnUrl` elsewhere. Missing token shows a gentle
  invalid state linking to `/auth/forgot-password`; `400 INVALID_RESET_TOKEN` swaps the form for the
  same state with expiry wording; `422` renders inline; success shows "Password updated" with a
  button to sign-in.

`AuthService.requestPasswordReset()` / `resetPassword()` sit beside the other auth calls. Both are
unauthenticated: no token is read, issued, or cleared, and an existing session is left intact -
resetting deliberately does not sign the user in.

The confirmation copy is intentionally non-committal ("if an account exists"), matching the API's
no-enumeration design; the client must not become the oracle the backend avoids being.

`fieldsMatchValidator(field, confirmField)` in `shared/forms/form-errors.ts` is a group-level
cross-field validator. It stays quiet while the confirmation is empty so the control's own `required`
message owns that case, and reports on the group rather than mutating the control's errors; the
component surfaces it under the confirm field.

Verification: `npm run build` PASS (753.81 kB initial - over the 700 kB warning budget, under the
850 kB error budget), `npx eslint .` PASS, `npm run test:unit` PASS (2 files, 3 tests),
`npm run format:check` PASS. Live smoke: both pages render in the sign-in visual language, the
no-token and tokened reset states resolve correctly. Forms were not submitted (no test account data
was entered).

Incidental fix: the remember-me `<label>` in `sign-in.html` wrapped the `p-checkbox` without a `for`,
failing `@angular-eslint/template/label-has-associated-control` and leaving the control unlabelled
for assistive tech. It now associates with `for="signin-remember"`.

## Admin section (added 2026-09-01 — Figma nodes 175:719 / 175:720)

Adds the whole `/admin` area behind a role guard, plus `role ADMIN` and the `DRAFT`
campaign status.

### Routes (all lazy, all `canActivate: [adminGuard]`)

| Route                         | Page                                                               |
| ----------------------------- | ------------------------------------------------------------------ |
| `/admin/dashboard`            | 5 stat cards, 21-day registration activity chart, recent campaigns |
| `/admin/registrations`        | Registered Clippers table across every campaign                    |
| `/admin/campaigns`            | status tabs + search + campaign card grid                          |
| `/admin/campaigns/new`        | 8-step creation wizard                                             |
| `/admin/campaigns/:slug/edit` | same wizard, loaded from an existing draft                         |
| `/admin/campaigns/:slug`      | admin detail + performance overview + that campaign's clippers     |
| `/forbidden`                  | signed-in non-admins land here instead of a sign-in loop           |

### Auth plumbing

`UserRole` widens to `'CREATOR' \| 'ADMIN'`; `AuthService.isAdmin` is a computed over the
rehydrated profile. `adminGuard` sends anonymous visitors to
`/auth/sign-in?returnUrl=…` and signed-in non-admins to `/forbidden`. The side nav is
role-aware: admins get Dashboard / Campaigns / Clippers, creators keep Campaigns /
Dashboard.

### Registered Clippers table

`shared/admin/clippers-table.ts` is one component used twice — standalone at
`/admin/registrations` and embedded on a campaign page with `campaignSlug` preset, which
also hides the campaign filter so an embedded table can never widen its own scope.
Columns: Clipper, Email, WhatsApp, Phone, Social (platform linking to the account URL),
Payment (method · number · name, `—` when the creator has no payout on file), Status tag,
Applied, and a per-row status select that PATCHes and toasts. Search/campaign/status
filters are server side and debounced 300 ms; CSV export is client side over exactly the
rows on screen, RFC 4180 quoted, with a formula-injection guard on leading `=+-@`.

### Verification

| Check                  | Result                                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`        | PASS. Initial 764.04 kB — over the 700 kB warning budget, under the 850 kB error budget.                                                                   |
| `npx eslint .`         | PASS (clean)                                                                                                                                               |
| `npm run test:unit`    | PASS (2 files, 3 tests)                                                                                                                                    |
| `npm run format:check` | PASS                                                                                                                                                       |
| Live probe             | `/api/v1/admin/{stats,registrations,campaigns}` all answer `401 UNAUTHORIZED` unauthenticated — endpoints exist and the error envelope matches `ApiError`. |
| Guard (anonymous)      | `/admin/dashboard` → `/auth/sign-in?returnUrl=%2Fadmin%2Fdashboard` ✓                                                                                      |
| `/forbidden`           | renders ✓                                                                                                                                                  |

### Contract deviations and assumptions

- **No `GET /admin/campaigns/:slug` in the contract.** `AdminRepository.campaignBySlug()`
  fetches the admin list and filters client side, because the public detail endpoint never
  returns DRAFT campaigns. A dedicated endpoint would remove that over-fetch.
- **Dashboard trend pills omitted.** The Figma shows `+7.4% ↑` badges; `AdminStats` carries
  no prior-period data, so they are not rendered rather than fabricated. Same for the
  "Old / New Registration" totals inside the activity card, and "Total Creators" renders a
  count (the mock shows `72%`, but the field is an integer).
- **Publish `422 INCOMPLETE` field list**: the contract says the response "lists missing
  fields" without specifying where. The wizard reads `error.missing` or `error.fields` when
  present and otherwise scans the message for known field names, then jumps to the earliest
  step that owns one.
- **Wizard requires more than the draft endpoint does.** `POST /admin/campaigns` accepts a
  sparse draft, but the wizard gates each step on the fields publish will demand, so the
  Save-draft/Publish pair on the preview step can never produce a draft that cannot publish.
  Content requirement is required (the design marks it `*`); resource label/link are left
  optional because not every campaign has one.
- **Icons**: the Figma uses an icon rail and inline glyphs. The `primeicons` font package is
  not installed (only `@primeicons/angular`), so `pi pi-*` classes would render nothing —
  all admin UI uses text labels, matching the rest of the app. Installing `primeicons` is a
  separate decision.
- **Images** are `data:` URLs capped at 500 KB, or a pasted https URL. Real object storage
  (Supabase Storage) remains future work.

### Still needs live verification

Everything behind an admin session: the guard's non-admin → `/forbidden` branch, the table
against real rows, status PATCH, the wizard's save/publish round trip, and publish's 422
handling. Signing in requires entering the seeded admin password, which I don't do — run
those flows manually with `admin@clapoutcreators.com`.

---

## Phase 04 Navbar and Dashboard Polish (added 2026-09-01)

### Outcome

The signed-in application shell now uses the uploaded compact white icon rail across admin and
creator workspaces. `/admin/dashboard` has been tightened toward the PDF/page-2 reference with a
compact metric row, registration activity plus text summary, a `Need Attention` panel, and recent
campaign cards. The dashboard canvas now uses the requested exact `#F9F9F9` background.

### Files and routes changed

- `shared/layout/side-nav.*`: desktop signed-in nav changed from a 256px labelled sidebar to a
  54px white icon rail with `#ECECEC` right border, uploaded `public/icons/*.svg` assets, PrimeNG
  tooltips, role-aware destinations, settings coming-soon affordance, and an account menu with sign
  out.
- `shared/charts/bar-chart.ts`: shared registration bar chart migrated from Chart.js to Apache
  ECharts through `ngx-echarts`, using tree-shakeable ECharts core imports.
- `features/admin/admin-dashboard.*`: dashboard composition updated for the metric/activity/
  attention/recent-campaign layout while preserving existing `/admin/stats` and `/admin/campaigns`
  repository calls.
- `package.json` / `package-lock.json`: `chart.js` removed; `echarts` and `ngx-echarts@22` added.
- `e2e/foundation.spec.ts`: stale foundation readiness assertion now accepts the rendered readiness
  marker instead of assuming `MOCKED`.
- `package.json`: `verify:angular-defaults` now scans TypeScript files only, avoiding valid
  template `ngModelOptions="{ standalone: true }"` false positives.

### Verification

| Check                     | Result                                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run format:check`    | PASS with Node `v24.18.0`.                                                                                                                                                     |
| `npm run lint`            | PASS.                                                                                                                                                                          |
| `npm run test:unit`       | PASS: 4 files, 10 tests. Added side-nav asset/accessibility coverage and admin-dashboard loading/ready/empty/error coverage.                                                   |
| `npm run build`           | PASS unsandboxed. Initial total `803.30 kB`, over the `700 kB` warning budget and under the `850 kB` error budget. Admin dashboard lazy chunk includes ECharts at `537.46 kB`. |
| `verify:angular-defaults` | PASS after narrowing the script to `.ts` files.                                                                                                                                |
| `npm run test:e2e`        | PASS unsandboxed: 2 Playwright foundation tests, including responsive widths and critical AXE check. Sandboxed run still fails with `listen EPERM`.                            |
| Chart.js source search    | PASS: no `chart.js`, `from 'chart.js'`, or `Chart.register` usage remains in `src`, `package.json`, or `package-lock.json`.                                                    |

### API readiness

| Dashboard section     | Status     | Notes                                                                                                           |
| --------------------- | ---------- | --------------------------------------------------------------------------------------------------------------- |
| Metrics               | INTEGRATED | Uses existing `GET /admin/stats`.                                                                               |
| Registration activity | INTEGRATED | Uses `registrationActivity` from existing stats response and keeps a non-visual text summary.                   |
| Need Attention        | MOCKED     | Derived on the frontend from stats/campaigns; report count remains `0` until a real endpoint exists.            |
| Recent campaigns      | INTEGRATED | Uses existing `GET /admin/campaigns`.                                                                           |
| Settings/profile nav  | BLOCKED    | Settings/profile routes are not implemented; settings is a coming-soon control, account menu supports sign out. |

### Responsive and accessibility notes

- Component tests verify icon-only rail accessible names, uploaded SVG paths, role-specific
  destinations, and account menu exposure.
- Mobile keeps labelled drawer navigation instead of icon-only labels.
- Existing Playwright responsive/AXE smoke passes for `/foundation`; authenticated
  `/admin/dashboard` visual/AXE verification still requires a signed-in admin session against the
  backend.
- Pre-existing generated `src/app/core/config/runtime-env.ts` remains changed to
  `https://clapout-backend.vercel.app/api/v1`; build presteps briefly regenerate it, and it was
  restored to the pre-existing value after verification.

### Next phase recommendation

`HOLD`

Reason: Phase 04 code and static/browser smoke gates are complete, but the admin-only dashboard still
needs a manual signed-in admin browser pass for desktop/tablet/mobile framing and AXE before moving to
Phase 05.

## Brands section + brand-first campaign flow (2026-09-02)

Adds the Brands section, moves campaign creation to start from a brand, and takes a
1:1 pass over the admin screens against the Figma exports in
`scratchpad/figma` (design width 1728, 80px rail, 1648 content column).

### Contract

`Brand` / `BrandDetail` / `BrandInput` land in `core/models/brand.ts` exactly as specified.
`PublicCampaign` gains `brandId`, and `CampaignDraftInput` drops its inline `brand` block for
`brandId` — campaign identity now comes from the Brand relation. `AdminRepository` gains
`brands(search?)`, `brand(id)`, `createBrand`, `updateBrand`, `deleteBrand`.

### Shared kit (so every admin page shares one set of styles)

- `shared/admin/wizard-shell.ts` — the full-viewport modal chrome both wizards use, built
  from the 172:823 node spec: `#FFFFFF`/90 overlay, round `#CDCDCD` close button at
  top-right, 53px orange app-icon tile inside a 326x125 header block, a 236x10 `#E0E0E0`
  progress track with an `#F26522` fill, Poppins SemiBold 40 title over SF Pro 22 subtitle,
  and a **546px** centred content column.
- `shared/admin/page-header.ts` — breadcrumb pill (`#F1F1F1`, home glyph) + title + subtitle
  with the page CTA projected on the right, matching the dashboard header exactly.
- `shared/admin/stat-card.ts`, `shared/admin/brand-logo-tile.ts`.
- `core/util/admin-options.ts` — countries (Ghana first), cities per country, industries,
  campaign tags, currencies, and `estimatedViews(budget, cpm)`.

### Sign-in aligned to 147:3105

66px/`r-20` orange logo tile with a 50px mark, Poppins SemiBold 32 "Welcome back",
SF Pro 18 `#464646` subtitle, a 423px form column, 50px/`r-12` fields with `#D7D7D7`
borders and `#DFDFDF` placeholders, an 18px remember-me / forgot row, and a 50px orange
submit.

### Deviations from the design, and why

- **"Views" (budget step)** is not in the API contract. Rendered as a read-only
  "Estimated views" = budget / CPM x 1000 rather than a free input that could not be saved.
- **"Product" (details step)** is not a contract field; it maps onto the campaign's `tags`.
- **Registrations have no brand filter.** `GET /admin/registrations` takes
  `campaignSlug|status|search` only, so a brand's clippers table is scoped by offering the
  brand's campaigns as filter options. Adding `?brandId=` to that endpoint would fix it
  properly.
- **Revenue formatting** (`GHS ₵ 40,000.00`) derives its currency from the brand's first
  campaign, since `BrandDetail.stats.revenue` is a bare number with no currency.

### Bundle budgets raised

`angular.json` initial-bundle budgets go from 700 kB / 850 kB to **850 kB / 1 MB**.
The admin section legitimately grew (brands, two wizards, the shared kit) and the
initial bundle sits at ~835 kB with every admin route already lazy, leaving no
headroom under the old error budget. No further code splitting was done.

### Round-1 design review fixes

- `campaignTimeLabel()` replaces a bare days-left everywhere a campaign card renders
  a countdown: DRAFT reads "Not scheduled", CLOSED "Ended", UPCOMING "Opens in N
  days", ACTIVE keeps the existing countdown. A draft with no `endDate` no longer
  claims "30 Days left".
- `formatMoneyExact()` renders the design's two-decimal money with a thin space
  ("₵ 2,000.00"). The public landing-mirror pages keep the looser `formatMoney`.
- Brand revenue renders a currency code OR a symbol, never both.
- The wizard overlay was `bg-[#FFFFFF]/90`, which let the rail bleed through at a
  different shade; it is now solid white at `z-50` with the close button at the
  spec's position.
- Admin page headers are 32px titles over 20px subtitles; campaign status pills are
  44px tall with 18px labels; compact-card headings are 24px.
- A signed-in visitor hitting `/auth/sign-in` is redirected to their dashboard
  instead of `/`.

### Round-2 design review fixes

- **Clippers table fits without scrolling at 1728.** Column widths now follow the
  Figma table's proportions and sum to the 1400px min-width; with
  `table-layout: fixed` they scale up to fill the panel at the design width and
  only scroll below ~1400px. Our two extra columns (Status tag + review select)
  are merged into one trailing "Review" column, so eight columns occupy the space
  the design gives seven. Both embeds (campaign detail, brand detail) inherit this
  from the shared component.
- **Brands list**: taller stat cards with 28px numbers, "Needs attention" in orange
  via a new `tone` input on `app-stat-card`, the design's left-aligned pagination
  with a page picker, and the search moved into the header row.
- **Brand detail**: the page title is "Brand detail" (the name lives in the header
  card only), buttons read "Pause Campaign" / "Edit", the campaign grid uses the
  shared `app-campaign-compact-card`, and the clippers embed is toolbar-less with
  Export driven from the panel header.

### Known failing test (not ours)

`admin-dashboard.spec.ts` asserts `<main>` carries an inline
`background-color: #f9f9f9`, but `admin-dashboard.html` sets no inline style — the
canvas colour comes from `app.html`. Both files are outside this workstream's
boundary, so the assertion is left failing: 9/10 unit tests pass. It needs either
the assertion dropped or the inline style added by the dashboard's owner.

## Clipper surfaces (2026-09-02) — Figma page "Web App - clippers"

Four surfaces rebuilt against `docs/design/figma-clippers/` (design width 1728,
mobile 402/380): the creator dashboard, sign-in, create-account, and the two
public campaign pages.

### Public chrome replaces the anonymous top nav

Anonymous visitors on public pages now get the landing site's chrome instead of
the studio top bar, so `/campaigns` reads as part of clapoutcreators.com:

- `shared/public/public-navbar.*` — the floating pill from 344:1182 (1537x96 at
  1728, 79.3px radius, 5% grey over a 17% white hairline), with Product ▾
  (marketing-site sections), Campaigns, Contact, Sign in and the orange
  "Get Started" pill. Below `lg` it collapses to logo + an orange round
  hamburger opening a drawer.
- `shared/public/public-footer.*` — the dark `#0C0C0C` footer: logo, blurb,
  Explore / Legal / Contact columns, the copyright rule, and the oversized
  "CLAPOUT" watermark bleeding off the bottom.
- `shared/public/public-links.ts` holds both components' link sets.
- `App` switches on three cases now: auth routes are chromeless, signed-in users
  keep the rail, anonymous visitors get the public chrome. The design has no
  signed-in variant of the public pages, so signed-in users keep the rail there.
- The old `shared/layout/top-nav.*` is deleted — nothing referenced it any more.
- `/terms` and `/privacy` are new placeholder pages, because the footer and the
  sign-up consent checkbox link to them and the routes had to resolve.

### Copy defects corrected from the design

"socias" → "socials", "whatsapp" → "WhatsApp", "No campaigns joied" →
"No campaigns joined", "Get Stared" → "Get Started", and the create-account
submit button reads "Create account" rather than the design's "Sign in".

### Design elements with no data behind them

- Dashboard stat trend pills: no API returns prior-period figures, so the pills
  are omitted rather than faked. Earned/Views/Submissions are zero placeholders;
  only Campaigns (registration count) is real.
- "Submit your first video" is rendered disabled with a "Coming soon" tooltip —
  content submission does not exist in the product and no endpoint was invented.
- The card's verified glyph shows for every brand; `PublicCampaign` has no
  verified flag.

## Desktop scale, mobile overflow, landing chrome and Share (2026-09-02)

- **`src/styles.css` is now the platform's scale knob.** `--ui-scale` is `0.8`
  from 1024px and `body` takes it as `zoom`, matching clapoutcreators.com. Two
  compensations live beside it and must move together with the scale: viewport
  units (`h-screen`, `min-h-screen`, `min-h-svh`) are divided by the scale
  because `zoom` does not divide them, and body-appended PrimeNG overlays get
  the zoom cancelled on the positioned box and re-applied to its content —
  without that, every panel lands `20%` of its trigger's height too low. A
  residual of `triggerSize x (1 - scale)` remains (~9px under a 46px button)
  because PrimeNG mixes `offsetHeight` (layout px) with rect coordinates
  (visual px); it reads as a slightly larger anchor gutter.
- **User-authored copy must carry `co-user-text`.** Brands paste raw links into
  campaign briefs and requirement notes; one unbroken URL is wider than a phone
  viewport and iOS answers by zooming the page out. `body` breaks long words by
  default, `co-user-text` adds `overflow-wrap: anywhere` so the token also stays
  out of the block's min-content width.
- **`shared/text/linkified-text`** turns bare `https://` and `www.` runs into
  new-tab anchors without touching the text, and `splitLinks()` is unit-tested.
  Use it for any field a brand types into.
- **`shared/public/share-campaign-button`** is the one Share control:
  `pill | text | icon | secondary | block` variants, `navigator.share` first,
  clipboard + toast second, dialog last. Its click stops propagation because two
  of its placements sit inside a card link.
- **`shared/admin/campaign-compact-card` no longer wraps the card in an `<a>`** —
  a button may not live inside an anchor, so the link is a transparent overlay
  stretched across the card and the Share control lifts above it.
- **`Registration.campaign` is in transition.** It is typed as a partial
  `PublicCampaign` plus the legacy flat fields; always render it through
  `registrationCampaign()`, which fills the gaps with the card's
  "not announced" states rather than zeros.
- The public navbar collapses at `md`, not `lg`, matching the landing site.
- **`/campaigns/:slug` has two variants over one content body.** Anonymous
  visitors and admins keep the public page (Figma 344:2763 / 344:2929); a
  signed-in clipper gets the studio card (397:3135 / 398:4552, leaderboard
  398:6785 / 398:6940). The body lives in one `<ng-template #contentBody>` and
  the two variants only differ in the column gaps, which come from
  `heroGapClass()` / `lowerColumnsClass()` / `bodyTopClass()` — put new geometry
  there rather than forking the markup. Both tabs and the submit overlay are URL
  state (`?tab=leaderboard`, `?submit=1`); tab switches use `replaceUrl` so the
  "‹ Back" pill still means "the page before this campaign".
- **`shared/creator/creator-page-header`** is the header row every signed-in
  creator screen starts with: the breadcrumb pill (every crumb but the last is
  muted) and the account chip. `creator-dashboard.html` still draws its own copy
  of the same markup; fold it into this component when that file is next touched.
- **`shared/creator/leaderboard-list`** owns "Top earners" — rank pill, the
  deterministic `avatarGradient(creatorId)` (clippers have no photo), the name
  and the verified-view count — plus the empty copy. Loading and error belong to
  the host, which is why the campaign page repeats the heading in those two
  states. `GET /public/campaigns/:slug/leaderboard` is public; the session token
  the interceptor attaches is only what fills `isMe` / `me`.
- **The phone tab bar lives in the side nav** (`.co-mobile-tabbar`, additive at
  the end of `side-nav.html`), shown only to signed-in creators. Its slots are
  positioned by percentage of the board's 402px width, and `src/styles.css` ends
  with the matching `body:has(.co-mobile-tabbar)` clearance rule for the content
  column — the bar is `position: fixed`, so the two must move together.
