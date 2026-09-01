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
campaign cards.

### Files and routes changed

- `shared/layout/side-nav.*`: desktop signed-in nav changed from a 256px labelled sidebar to a
  54px white icon rail with `#ECECEC` right border, PrimeIcons SVGs, PrimeNG tooltips, role-aware
  destinations, settings coming-soon affordance, and an account menu with sign out.
- `features/admin/admin-dashboard.*`: dashboard composition updated for the metric/activity/
  attention/recent-campaign layout while preserving existing `/admin/stats` and `/admin/campaigns`
  repository calls.
- `e2e/foundation.spec.ts`: stale foundation readiness assertion now accepts the rendered readiness
  marker instead of assuming `MOCKED`.
- `package.json`: `verify:angular-defaults` now scans TypeScript files only, avoiding valid
  template `ngModelOptions="{ standalone: true }"` false positives.

### Verification

| Check                     | Result                                                                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run format:check`    | PASS with Node `v24.18.0`.                                                                                                                          |
| `npm run lint`            | PASS.                                                                                                                                               |
| `npm run test:unit`       | PASS: 4 files, 10 tests. Added side-nav role/accessibility coverage and admin-dashboard loading/ready/empty/error coverage.                         |
| `npm run build`           | PASS unsandboxed. Initial total `812.55 kB`, over the `700 kB` warning budget and under the `850 kB` error budget.                                  |
| `verify:angular-defaults` | PASS after narrowing the script to `.ts` files.                                                                                                     |
| `npm run test:e2e`        | PASS unsandboxed: 2 Playwright foundation tests, including responsive widths and critical AXE check. Sandboxed run still fails with `listen EPERM`. |

### API readiness

| Dashboard section     | Status     | Notes                                                                                                           |
| --------------------- | ---------- | --------------------------------------------------------------------------------------------------------------- |
| Metrics               | INTEGRATED | Uses existing `GET /admin/stats`.                                                                               |
| Registration activity | INTEGRATED | Uses `registrationActivity` from existing stats response and keeps a non-visual text summary.                   |
| Need Attention        | MOCKED     | Derived on the frontend from stats/campaigns; report count remains `0` until a real endpoint exists.            |
| Recent campaigns      | INTEGRATED | Uses existing `GET /admin/campaigns`.                                                                           |
| Settings/profile nav  | BLOCKED    | Settings/profile routes are not implemented; settings is a coming-soon control, account menu supports sign out. |

### Responsive and accessibility notes

- Component tests verify icon-only rail accessible names, role-specific destinations, and account
  menu exposure.
- Mobile keeps labelled drawer navigation instead of icon-only labels.
- Existing Playwright responsive/AXE smoke passes for `/foundation`; authenticated
  `/admin/dashboard` visual/AXE verification still requires a signed-in admin session against the
  backend.
- Pre-existing generated `src/app/core/config/runtime-env.ts` remains changed to
  `https://clapout-backend.vercel.app/api/v1`; this phase did not hand-edit it.

### Next phase recommendation

`HOLD`

Reason: Phase 04 code and static/browser smoke gates are complete, but the admin-only dashboard still
needs a manual signed-in admin browser pass for desktop/tablet/mobile framing and AXE before moving to
Phase 05.
