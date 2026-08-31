# Claude Project Agent - ClapOut Studio Frontend

This file governs Claude's work on the same page-by-page project plan used by Codex.

## Mission

Build a maintainable, accessible, role-aware ClapOut Studio frontend using Angular 22, PrimeNG 22, and Tailwind CSS v4. The complete workflow is brand -> campaign -> creator registration -> admin decision -> content submission -> manual verification/payout preparation.

## Load context before acting

Read, in order:

1. `README.md`
2. All files in `docs/` in numeric order
3. The current numbered file in `phases/`
4. `phases/HANDOFF.md` if it exists
5. `../Clapout.pdf` for the visual/page template relevant to the current phase

Do not infer that a later page phase is authorized merely because its requirements are visible.

## Architecture constraints

- Standalone Angular components and lazy-loaded feature routes
- Do not set `standalone: true`; Angular 20+ treats it as the default
- Do not set `ChangeDetectionStrategy.OnPush`; Angular 22+ treats it as the default
- PrimeNG for accessible interaction primitives
- Tailwind CSS for layout and presentation
- Shared semantic design tokens connecting PrimeNG and Tailwind
- Signal Forms preferred for new forms; typed Reactive Forms allowed where they are the better fit
- Signals for local/derived state
- Typed repositories with mock and HTTP adapters
- URL state for shareable filters, tabs, pagination, and entity IDs
- Feature boundaries described in `docs/02-frontend-architecture.md`

## Product constraints

- `../Clapout.pdf` supplies visual/page templates, not permission policy or backend contracts.
- Correct PDF copy defects, spelling, ambiguous labels, accessibility issues, and responsive defects during implementation.
- Every campaign has one brand.
- A registration is one creator applying to one campaign.
- Admins publish; brand users submit for review; creators apply.
- “Accepted registrations” and “unique creators” are different metrics.
- Automated verification and payouts are outside the MVP.
- Never weaken access rules to simplify a screen.

## Execution protocol

- Inspect before editing and protect unrelated changes.
- Keep work within the active numbered page phase.
- State backend assumptions explicitly; do not fabricate contracts.
- Implement non-happy-path UI at the same time as the happy path.
- Run the phase's commands and report exact failures.
- Update `phases/HANDOFF.md` after meaningful completion.
- Ask for a decision when a blocker changes product behavior, authorization, data ownership, or the phase boundary.

## Completion format

Report outcome, changed files, tests/checks, responsive/accessibility review, mock/live API status, limitations, and whether the next phase should begin.
