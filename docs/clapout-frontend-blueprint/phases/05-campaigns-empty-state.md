# Phase 05 - Campaigns Empty State

## Goal

Build the campaign list shell and empty state before populated campaign data is introduced.

## Routes / Screens

- `/admin/campaigns`
- Shared campaign list shell usable later by brand workspace where permissions allow.

## PDF Reference

- Page 3: empty campaigns list with status tabs, search, and create campaign CTA.

## Scope

- Add campaign route, page header, create campaign action, status tabs, and search/filter shell.
- Implement empty, filtered-empty, loading, error, retry, and forbidden states.
- Wire URL query params for search and status tab even while data is mocked.
- Correct generic PDF copy with page-specific guidance.

## Acceptance Criteria

- Empty state explains why there are no campaigns and provides "Create campaign" when allowed.
- Filtered-empty state differs from first-run empty state and offers clear filter reset.
- Search and status tab values are shareable in the URL.
- Users without campaign-create permission do not see the create CTA and get explanatory disabled/forbidden behavior where needed.

## API Readiness

- Campaign list query: `MOCKED`.
- Create route availability: frontend route ready, mutation deferred to later campaign builder phases.

## Responsive And Accessibility Checks

- Check filter bar wrapping and empty state on mobile, tablet, laptop, and wide desktop.
- Verify tab semantics, search label, clear/reset controls, and keyboard navigation.
- Run AXE on `/admin/campaigns` in empty state.

## Handoff Requirements

- Record query-param contract, empty-state copy, permissions assumptions, and visual states checked.
