# Claude Project Agent - ClapOut Studio Frontend

This file governs Claude's work on the same project plan used by Codex.

## Mission

Build a maintainable, accessible, role-aware ClapOut Studio frontend using Angular 22, PrimeNG 22, and Tailwind CSS v4. The complete workflow is brand -> campaign -> creator registration -> admin decision -> content submission -> manual verification/payout preparation.

## Load Context Before Acting

Read, in order:

1. `docs/clapout-frontend-blueprint/README.md`
2. All files in `docs/clapout-frontend-blueprint/docs/` in numeric order
3. The current numbered file in `docs/clapout-frontend-blueprint/phases/`
4. `docs/clapout-frontend-blueprint/phases/HANDOFF.md` if it exists
5. `docs/Clapout.pdf` for the visual/page template relevant to the current phase

Do not infer that a later page phase is authorized merely because its requirements are visible.

## Project Structure (Feature-First Architecture)

This is a feature-first Angular workspace. It scales across many business domains (brands, campaigns, creators, registrations, submissions, payments, analytics, settings, ...), so nothing new gets dropped into a flat, app-wide `components/`, `services/`, or `pages/` bucket.

```
src/
├── app/
│   ├── app.component.ts
│   ├── app.config.ts
│   ├── app.routes.ts
│   │
│   ├── core/                     # app-wide infrastructure, imported once
│   │   ├── auth/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   ├── services/
│   │   │   └── models/
│   │   ├── api/
│   │   │   ├── api-client.service.ts
│   │   │   ├── api.config.ts
│   │   │   └── api-endpoints.ts
│   │   ├── errors/
│   │   │   ├── error-handler.service.ts
│   │   │   └── http-error.interceptor.ts
│   │   ├── services/
│   │   │   ├── notification.service.ts
│   │   │   ├── storage.service.ts
│   │   │   └── confirmation.service.ts
│   │   └── models/
│   │
│   ├── layout/                   # app shell only, independent of any feature
│   │   ├── app-shell/
│   │   ├── sidebar/
│   │   ├── header/
│   │   ├── breadcrumbs/
│   │   └── layout.routes.ts
│   │
│   ├── shared/                   # reusable across two or more domains
│   │   ├── components/
│   │   │   ├── page-header/
│   │   │   ├── status-badge/
│   │   │   ├── empty-state/
│   │   │   ├── loading-state/
│   │   │   ├── confirmation-dialog/
│   │   │   └── data-table/
│   │   ├── directives/
│   │   ├── pipes/
│   │   ├── utils/
│   │   ├── constants/
│   │   └── types/
│   │
│   ├── features/                 # one folder per business domain
│   │   ├── dashboard/
│   │   ├── brands/
│   │   ├── campaigns/
│   │   ├── creators/
│   │   ├── registrations/
│   │   ├── submissions/
│   │   ├── payments/
│   │   ├── analytics/
│   │   ├── team/
│   │   └── settings/
│   │
│   └── ui/                       # dumb, presentation-only primitives
│       ├── button/
│       ├── card/
│       ├── dialog/
│       ├── input/
│       └── table/
│
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── environments/
│   ├── environment.ts
│   └── environment.production.ts
│
├── styles/
│   ├── _variables.scss
│   ├── _primeng.scss
│   ├── _utilities.scss
│   └── styles.scss
│
├── index.html
└── main.ts
```

### Feature internal structure

Every folder under `features/` owns everything specific to that domain and follows this shape (`campaigns` shown as the reference example — apply the same shape to brands, creators, registrations, submissions, payments, analytics, team, and settings):

```
features/campaigns/
├── pages/
│   ├── campaign-list/
│   │   ├── campaign-list.component.ts
│   │   ├── campaign-list.component.html
│   │   └── campaign-list.component.spec.ts
│   ├── campaign-details/
│   ├── campaign-create/
│   └── campaign-edit/
│
├── components/
│   ├── campaign-card/
│   ├── campaign-status/
│   ├── campaign-summary/
│   └── campaign-form/
│
├── data-access/
│   ├── campaign.service.ts
│   ├── campaign.api.ts
│   ├── campaign.store.ts
│   └── campaign.queries.ts
│
├── models/
│   ├── campaign.model.ts
│   ├── campaign.dto.ts
│   └── campaign-status.ts
│
├── utils/
│   └── campaign.utils.ts
│
└── campaign.routes.ts
```

- `pages/` — routed, top-level views for the feature. One folder per route, each with its own `.component.ts` / `.component.html` / `.component.spec.ts`.
- `components/` — presentational components used only within this feature. If a component earns a second consumer in another feature, promote it to `shared/components` (or `ui/` if it is domain-agnostic) instead of importing it across features.
- `data-access/` — everything that talks to the backend or holds feature state: services, API adapters, stores, query helpers. Nothing outside `data-access/` makes HTTP calls or owns canonical state for the feature.
- `models/` — domain models, DTOs, and status/enum types for this feature only.
- `utils/` — pure helper functions specific to this feature.
- `<feature>.routes.ts` — the feature's own lazy-loaded route definitions.

### Structural rules

- `core/` holds only app-wide infrastructure that exists once (auth, API client, error handling, cross-cutting services). Never put feature-specific code here.
- `layout/` is the app shell only. It must stay independent of `features/` — it must not import feature code.
- `shared/` holds components/utilities used by two or more features, not a dumping ground for anything reusable-in-theory. If something is used by exactly one feature today, it belongs in that feature's own `components/` or `utils/` until a second consumer appears.
- `ui/` holds dumb, presentation-only primitives (button, card, dialog, input, table) with no domain knowledge — the building blocks that `shared/components` and feature components compose.
- Keep domain concepts distinct even when a screen merges them visually. Example: a `Creator` (the creator themselves) and a `Registration` (that creator applying to one campaign) are different concepts and belong in `features/creators/` and `features/registrations/` respectively — never merge them into one model or one folder just because the UI displays them together.
- Cross-feature communication goes through routes and IDs, not direct imports of another feature's internals.
- This structure governs all upcoming features. Existing code does not need to be migrated in one pass, but any feature being touched substantially should be brought in line with this layout as part of that work rather than extended in its old shape.

## Architecture Constraints

- Standalone Angular components and lazy-loaded feature routes.
- Do not set `standalone: true`; Angular 20+ treats it as the default.
- Do not set `ChangeDetectionStrategy.OnPush`; Angular 22+ treats it as the default.
- PrimeNG provides accessible interaction primitives and app services.
- Tailwind handles layout, density, spacing, responsive behavior, and composition.
- Shared semantic design tokens connect PrimeNG and Tailwind through the theme preset and `tailwindcss-primeui`.
- Signal Forms are preferred for new forms; typed Reactive Forms are acceptable when Signal Forms are not a clean fit.
- Signals own local and derived state.
- Typed repositories isolate mock and HTTP adapters, and live inside each feature's `data-access/` folder (see Project Structure above).
- URL state owns shareable filters, tabs, pagination, and entity IDs.
- Feature folder layout is defined above and mirrored in `docs/clapout-frontend-blueprint/docs/02-frontend-architecture.md`; the two must stay in sync.

## Product Constraints

- `docs/Clapout.pdf` supplies visual/page templates, not permission policy or backend contracts.
- Correct PDF copy defects, spelling, ambiguous labels, accessibility issues, and responsive defects during implementation.
- Every campaign has one brand.
- A registration is one creator applying to one campaign.
- Admins publish; brand users submit for review; creators apply.
- "Accepted registrations" and "unique creators" are different metrics.
- Automated verification and payouts are outside the MVP.
- Never weaken access rules to simplify a screen.

## Execution Protocol

- Inspect before editing and protect unrelated changes.
- Keep work within the active numbered page phase.
- State backend assumptions explicitly; do not fabricate contracts.
- Implement loading, empty, filtered-empty, error, retry, success, permission, and validation states with the happy path.
- Use PrimeNG components for tables, dialogs, drawers, menus, selects, date pickers, toasts, confirmations, steppers, uploaders, and pagination unless there is a documented reason not to.
- Run the phase's commands and report exact failures.
- Update `docs/clapout-frontend-blueprint/phases/HANDOFF.md` after meaningful completion.
- Ask for a decision when a blocker changes product behavior, authorization, data ownership, or the phase boundary.

## Completion Format

Report outcome, changed files, tests/checks, responsive/accessibility review, mock/live API status, limitations, and whether the next phase should begin.
