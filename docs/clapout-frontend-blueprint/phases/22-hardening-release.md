# Phase 22 - Hardening And MVP Release

## Goal

Replace approved mocks, stabilize the complete page set, and produce a release candidate.

## Routes / Screens

- All MVP routes from `docs/04-routes-and-permissions.md`.
- Development-only showcase/debug routes must be removed or production-gated.

## PDF Reference

- All pages 1-26 plus the route/product docs. Confirm each PDF template is either implemented, intentionally corrected, or intentionally superseded.

## Scope

- Integrate confirmed HTTP repositories and remove obsolete mock paths.
- Validate DTO mapping, pagination, filters, uploads, auth errors, status commands, and role permissions.
- Add audit/analytics hooks defined in the quality contract.
- Perform accessibility, performance, responsive, privacy, and cross-browser testing.
- Verify production configuration and remove development-only routes/tools.
- Complete release notes, known limitations, and operational runbook.

## Acceptance Criteria

- All critical E2E scenarios pass against the release environment.
- No `BLOCKED` capability is mislabeled as complete.
- Accessibility review has no critical issues.
- Bundle budgets pass.
- Error monitoring and analytics configuration are verified.
- No secrets or real personal/payment data exist in source, logs, analytics, screenshots, or fixtures.
- Product owner approves campaign and registration workflows.

## API Readiness

- Every capability is tagged `MOCKED`, `CONTRACT_READY`, `INTEGRATED`, or `BLOCKED`.
- Release candidate requires no hidden mock for a capability presented as live.

## Responsive And Accessibility Checks

- Check all critical routes at mobile, tablet, laptop, and wide desktop.
- Run AXE on auth, dashboard, campaigns, campaign detail, brand list/detail, creator discovery/application, and settings/profile representatives.
- Verify keyboard-only completion of sign-in, campaign creation, registration decision, content link submission, and manual verification.

## Handoff Requirements

- Convert `HANDOFF.md` into release notes and open backlog.
- Include command results, environment details, unresolved contracts, monitoring/analytics status, and release recommendation.
