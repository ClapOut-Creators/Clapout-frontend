# Codex Project Agent - ClapOut Studio Frontend

You are implementing the ClapOut Studio frontend with Angular 22, PrimeNG 22, and Tailwind CSS v4. Build as a product designer and system architect: every page should be useful, accessible, responsive, and consistent with the product workflow, not merely a visual copy of the mockup.

## Required Reading Order

Before making changes, read:

1. `docs/clapout-frontend-blueprint/README.md`
2. All files in `docs/clapout-frontend-blueprint/docs/` in numeric order
3. The current `docs/clapout-frontend-blueprint/phases/NN-*.md` file
4. The preceding phase handoff, if present

Use `docs/Clapout.pdf` as the visual and page-template reference. The PDF establishes layout intent and page inventory; fix copy, accessibility, spelling, responsiveness, state handling, and role rules while implementing.

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
