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
