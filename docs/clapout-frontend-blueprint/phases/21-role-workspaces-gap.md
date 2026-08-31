# Phase 21 - Role Workspaces Gap

## Goal

Define and implement the minimum brand-user and creator pages required by the MVP where the PDF does not provide full templates.

## Routes / Screens

- Brand routes: `/brand/dashboard`, `/brand/campaigns`, `/brand/campaigns/new`, `/brand/campaigns/:campaignId`, `/brand/campaigns/:campaignId/edit`, `/brand/registrations`, `/brand/profile`, `/brand/settings`.
- Creator routes: `/creator/dashboard`, `/creator/campaigns`, `/creator/campaigns/:campaignId`, `/creator/campaigns/:campaignId/apply`, `/creator/applications`, `/creator/applications/:registrationId`, `/creator/participation/:registrationId`, `/creator/profile`, `/creator/settings`.

## PDF Reference

- No complete dedicated brand-user or creator templates. Reuse the design system, shell rules, campaign cards, campaign detail, and form patterns from pages 2-26.

## Scope

- Build minimum coherent brand-user workspace: own dashboard, own campaigns, submit campaign for review, read-only registrations/results, profile, and settings.
- Build minimum coherent creator workspace: dashboard, campaign discovery, campaign detail, application form/review/submission, applications timeline, accepted participation workspace, content-link submission, profile, payout details, settings, and informational earnings.
- Reuse shared campaign and form components while preserving role-specific permissions and copy.
- Mark unsupported backend actions as `MOCKED` or `BLOCKED`.

## Acceptance Criteria

- Brand user cannot approve/publish, view another brand, or change registration decisions.
- Creator cannot open admin/brand URLs, cannot apply twice without a clear duplicate explanation, and cannot submit content before acceptance.
- Creator mobile navigation is usable and matches the shell rules.
- Status timelines state the user's next action for submitted, under review, waitlisted, accepted, rejected, content submitted, verified, and payout pending states.
- Earnings/payout screens do not imply automated payout execution.

## API Readiness

- Brand workspace repositories: `MOCKED` unless backend contracts exist.
- Creator discovery, applications, participation, profile, payout details, and content links: `MOCKED` unless backend contracts exist.

## Responsive And Accessibility Checks

- Check role dashboards, discovery/list pages, forms, timelines, and settings on mobile, tablet, laptop, and wide desktop.
- Run AXE on one representative brand page and one representative creator page.
- Verify keyboard navigation, focus order, form errors, status text, and mobile navigation.

## Handoff Requirements

- Record which routes were implemented, which are placeholders, which capabilities are blocked, and what PDF patterns were reused.
