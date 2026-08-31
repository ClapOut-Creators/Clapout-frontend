# ClapOut Studio

ClapOut Studio is the Angular frontend for the ClapOut campaign operations MVP.

Phase 00 establishes the application foundation only: Angular, PrimeNG, Tailwind, semantic tokens, typed configuration, mock-first repository mode, linting, unit tests, Playwright smoke tests, and the phase handoff workflow.

## Prerequisites

- Node `v24.18.0` via `.nvmrc` or any Angular-supported Node `24.15+` runtime.
- npm `11.16.0` or newer.

```bash
nvm use
npm ci
```

## Development

```bash
npm start
```

The app serves at `http://localhost:4200/`.

## Verification

```bash
npm run format:check
npm run lint
npm run build
npm run test:unit
npm run test:e2e
npm run verify:angular-defaults
```

Install Playwright browsers when needed:

```bash
npm run test:e2e:install
```

## Phase Workflow

1. Read `AGENTS.md`.
2. Read `docs/clapout-frontend-blueprint/README.md`.
3. Read `docs/clapout-frontend-blueprint/docs/` in numeric order.
4. Read the current phase file and the previous `docs/clapout-frontend-blueprint/phases/HANDOFF.md`.
5. Implement only the current phase boundary.
6. Run focused checks, responsive checks, and accessibility checks.
7. Update the phase checklist and handoff before moving on.

## API Readiness

The frontend is mock-first during Phase 00. `APP_ENVIRONMENT` provides `apiBaseUrl`, `useMockAdapters`, and an `apiReadiness` marker. The current marker is `MOCKED`; do not add backend endpoints until a contract is confirmed.
