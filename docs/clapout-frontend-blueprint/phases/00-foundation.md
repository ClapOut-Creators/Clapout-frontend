# Phase 00 - Foundation

## Goal

Create the Angular, PrimeNG, Tailwind, testing, and architecture foundation needed before page work begins.

## Routes / Screens

- Root app bootstrap and placeholder route only.
- No production feature pages yet.

## PDF Reference

- No direct PDF page. This phase enables all PDF-backed pages.

## Scope

- Confirm Angular 22, PrimeNG 22, Tailwind CSS v4, and strict TypeScript.
- Install and configure PrimeNG, PrimeIcons, `tailwindcss-primeui`, Chart.js, date utilities, Vitest, Playwright, ESLint, and Prettier as needed.
- Configure PrimeNG styled mode with a custom ClapOut preset and shared semantic tokens.
- Create `core`, `shared`, and `features` boundaries.
- Add environment configuration and an API base URL token without secrets.
- Establish CI commands and initial bundle budgets.
- Add a mock-adapter environment switch.
- Document install, run, build, test, and phase workflow commands.

## Acceptance Criteria

- Application builds and renders a placeholder shell.
- Tests and Playwright smoke test run.
- Tailwind and PrimeNG semantic colors render from the same tokens.
- `README` contains install, run, test, and build commands.
- No Angular implementation sets `standalone: true` or `ChangeDetectionStrategy.OnPush` explicitly.
- No raw secrets or production personal data exist.

## API Readiness

- App config and repository provider strategy: `MOCKED` until a confirmed backend contract exists.

## Responsive And Accessibility Checks

- Placeholder shell renders at mobile, tablet, laptop, and wide desktop widths.
- App root has a valid document title, language, focus-visible styles, and no AXE critical issues.

## Handoff Requirements

- Record exact Angular, PrimeNG, Tailwind, Node/npm, test, and build versions.
- Record commands run and any missing tooling.
- Recommend `PROCEED` only when install/build/test smoke gates are usable.

## Exit gate

- [x] Frozen-lockfile install succeeds
- [x] Lint succeeds
- [x] Production build succeeds
- [x] Unit smoke test succeeds
- [ ] Playwright smoke test succeeds
- [x] No raw secrets or production personal data exist
- [x] `phases/HANDOFF.md` records version choices and commands
