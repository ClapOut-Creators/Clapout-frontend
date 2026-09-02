# Codex Project Agent - ClapOut Studio Frontend

You are implementing the ClapOut Studio frontend with Angular 22, PrimeNG 22, and Tailwind CSS v4. Build as a product designer and system architect: every page should be useful, accessible, responsive, and consistent with the product workflow, not merely a visual copy of the mockup.

## Required Reading Order

Before making changes, read:

1. `docs/clapout-frontend-blueprint/README.md`
2. All files in `docs/clapout-frontend-blueprint/docs/` in numeric order
3. The current `docs/clapout-frontend-blueprint/phases/NN-*.md` file
4. The preceding phase handoff, if present

Use `docs/Clapout.pdf` as the visual and page-template reference. The PDF establishes layout intent and page inventory; fix copy, accessibility, spelling, responsiveness, state handling, and role rules while implementing.

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

## Angular Rules

- Use standalone Angular APIs and lazy-loaded feature routes.
- Do not set `standalone: true` in decorators; it is the Angular 20+ default.
- Do not set `changeDetection: ChangeDetectionStrategy.OnPush`; it is the Angular 22+ default.
- Use signals for local UI state, `computed()` for derived state, and `linkedSignal()` when dependent writable state must stay synchronized.
- Use `input()`, `output()`, and `model()` instead of decorator inputs/outputs.
- Prefer Signal Forms for new forms. If a feature cannot use Signal Forms cleanly, use typed Reactive Forms.
- Use native template control flow: `@if`, `@for`, and `@switch`.
- Do not use `ngClass` or `ngStyle`; use class and style bindings.
- Use `inject()` instead of constructor injection.
- Use `NgOptimizedImage` for static images. It does not apply to inline base64 images.

## PrimeNG And Tailwind Rules

- Prefer PrimeNG for behavioral primitives: table, select, multiselect, date picker, dialog, drawer, toast, confirmation, menu, paginator, stepper, upload, tabs, and form inputs.
- Use Tailwind for layout, density, responsive composition, and small visual adjustments.
- Configure PrimeNG theme tokens once through the app preset; do not scatter raw brand colors through templates.
- Use `tailwindcss-primeui` utilities so PrimeNG and Tailwind share semantic tokens.
- Use PrimeIcons for actions and navigation unless a custom brand/product asset is required.
- Use PrimeNG `pt` pass-through only when component APIs and tokens cannot express the needed accessible markup or styling.

## Accessibility Requirements

- The application must pass AXE checks and WCAG AA minimums.
- Every form control needs a programmatic label, description when useful, and announced error state.
- Icon-only controls need accessible names and visible tooltips.
- Statuses must include text and must never rely on color alone.
- Keyboard users must be able to operate navigation, dialogs, drawers, menus, filters, date pickers, uploads, tables, and wizards.
- Preserve visible focus rings and restore focus when overlays close.
- Loading, empty, filtered-empty, error, retry, success, disabled, and forbidden states are part of the feature.

## Delivery Rules

- Work only on the current numbered page phase unless the user explicitly expands scope.
- Page phases are implementation boundaries. A phase may include shared components only when needed by that page.
- Keep mock data out of routed components; use typed repositories, domain models, and mock or HTTP adapters.
- Never invent a backend endpoint. Mark assumptions as `MOCKED`, `CONTRACT_READY`, `INTEGRATED`, or `BLOCKED`.
- Enforce permissions in route and UI behavior while documenting that the server remains authoritative.
- Do not expose creator personal, social, or payment data in logs, analytics, screenshots, or production fixtures.
- Preserve unrelated user changes.

## Per-Phase Workflow

1. Read the current phase and preceding handoff.
2. Inspect affected routes, components, adapters, mocks, and tests.
3. Implement the smallest coherent page slice, including non-happy-path states.
4. Run focused tests, then the phase gates.
5. Check desktop, tablet, and mobile layouts.
6. Check keyboard/focus behavior and AXE accessibility.
7. Update the phase checklist and `docs/clapout-frontend-blueprint/phases/HANDOFF.md`.
8. Stop at the phase boundary and report whether it is safe to proceed.

## Completion Report

Every completion report must include outcome, files changed, verification performed, responsive states checked, accessibility checks, API readiness tags, known limitations, and the next phase recommendation.
