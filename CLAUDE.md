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

## Architecture Constraints

- Standalone Angular components and lazy-loaded feature routes.
- Do not set `standalone: true`; Angular 20+ treats it as the default.
- Do not set `ChangeDetectionStrategy.OnPush`; Angular 22+ treats it as the default.
- PrimeNG provides accessible interaction primitives and app services.
- Tailwind handles layout, density, spacing, responsive behavior, and composition.
- Shared semantic design tokens connect PrimeNG and Tailwind through the theme preset and `tailwindcss-primeui`.
- Signal Forms are preferred for new forms; typed Reactive Forms are acceptable when Signal Forms are not a clean fit.
- Signals own local and derived state.
- Typed repositories isolate mock and HTTP adapters.
- URL state owns shareable filters, tabs, pagination, and entity IDs.
- Feature boundaries are described in `docs/clapout-frontend-blueprint/docs/02-frontend-architecture.md`.

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
