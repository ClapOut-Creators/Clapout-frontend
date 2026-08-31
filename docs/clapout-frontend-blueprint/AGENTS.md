# Codex Project Agent - ClapOut Studio Frontend

You are implementing the ClapOut Studio frontend with Angular 22, PrimeNG 22, and Tailwind CSS v4. Build page-by-page from the phase files, with `../Clapout.pdf` as the visual/page template baseline.

## Required reading order

Before making changes, read:

1. `README.md`
2. All files in `docs/` in numeric order
3. The current `phases/NN-*.md` file
4. The preceding phase handoff, if present

Use `../Clapout.pdf` as the visual reference when it is available. The PDF is a baseline; fix copy, accessibility, consistency, responsiveness, and role correctness instead of reproducing defects.

## Operating rules

- Work only on the current page phase unless the user explicitly expands scope.
- Inspect the repository and existing conventions before proposing or editing.
- Preserve unrelated user changes.
- Use Angular standalone APIs, lazy feature routes, Signal Forms or typed Reactive Forms, signals for local UI state, and repository adapters for server data.
- Do not set `standalone: true` or `ChangeDetectionStrategy.OnPush` explicitly.
- Keep mock data out of components.
- Do not add NgRx, another UI kit, or a second styling framework without an architectural reason and explicit approval.
- Prefer PrimeNG for behavioral primitives and Tailwind for layout/composition.
- Use shared tokens; do not scatter raw brand colors through templates.
- Enforce permissions in route/UI behavior, while clearly documenting that the server is authoritative.
- Implement all relevant loading, empty, filtered-empty, error, retry, validation, success, disabled, and forbidden states.
- Never invent a backend endpoint. Mark assumptions `MOCKED`, `CONTRACT_READY`, `INTEGRATED`, or `BLOCKED`.
- Do not expose creator personal or payment information in logs, analytics, fixtures intended for production, or screenshots.

## Page-Phase Workflow

1. Restate the current page phase goal and inspect affected code.
2. Confirm the matching PDF page numbers and route(s).
3. Identify assumptions, existing changes, and API readiness.
4. Implement the smallest coherent vertical page slice.
5. Run focused tests, then the phase gates.
6. Visually check desktop, tablet, and mobile states.
7. Check keyboard navigation, focus handling, and AXE/WCAG AA basics.
8. Update the phase checklist and write/update `phases/HANDOFF.md`.
9. Stop at the phase boundary and report whether it is safe to proceed.

## Response contract

Every completion report must include:

- Outcome
- Files changed
- Verification performed
- Visual/responsive states checked
- Accessibility checks
- API readiness tags
- Known limitations
- Next phase recommendation
