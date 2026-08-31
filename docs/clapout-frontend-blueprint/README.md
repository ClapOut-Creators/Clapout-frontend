# ClapOut Studio Frontend Blueprint

This folder is the delivery source of truth for the ClapOut frontend MVP shown in `../Clapout.pdf`.

The product is a role-aware Angular web application with three experiences:

- `ADMIN`: operates brands, campaigns, registrations, verification, and payout preparation.
- `BRAND`: manages its own profile and campaign drafts, subject to ClapOut approval.
- `CREATOR`: discovers campaigns, applies, tracks participation, submits content, and manages payout details.

The MVP is frontend-first. API calls are expressed through typed repository interfaces so development can begin with mock adapters and switch to the real backend without rewriting pages.

## Start here

1. Read [docs/01-product-mvp.md](docs/01-product-mvp.md).
2. Read [docs/02-frontend-architecture.md](docs/02-frontend-architecture.md).
3. Read [docs/03-design-system.md](docs/03-design-system.md).
4. Read [docs/04-routes-and-permissions.md](docs/04-routes-and-permissions.md).
5. Read [docs/05-quality-and-delivery.md](docs/05-quality-and-delivery.md).
6. Read [docs/06-pdf-page-map.md](docs/06-pdf-page-map.md).
7. Execute the page-level phase files in [phases](phases/) in numeric order.

AI coding agents must also read either `AGENTS.md` (Codex) or `CLAUDE.md` (Claude). Both files point to the same requirements, page phases, and phase gates.

## Page-phase delivery

The numbered phase files intentionally break the PDF templates into small page or screen slices: auth pages, shell, dashboard, campaign states, campaign builder steps, brand pages, verification, role-workspace gaps, and hardening. A phase is the implementation boundary unless the user explicitly expands scope.

## Delivery rule

A phase is complete only when its checklist, tests, responsive checks, accessibility checks, and handoff notes are complete. Do not begin the next phase because the screens merely “look finished.”
