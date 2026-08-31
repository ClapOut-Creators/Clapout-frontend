# Phase 06 - Campaigns List

## Goal

Populate the campaigns list with cards/table behavior, status tabs, search, pagination, and responsive density.

## Routes / Screens

- `/admin/campaigns`
- Campaign cards or responsive table variants used by admin and later brand routes.

## PDF Reference

- Pages 4 and 12: populated campaign list variants, active/rejected/awaiting-review status cards, paid-out and CPM metrics.

## Scope

- Add deterministic mock campaign summaries outside routed components.
- Implement campaign cards/table rows with brand, platform, status, time remaining, budget spent, and CPM.
- Add server-oriented pagination model and pagination summary.
- Preserve URL state for search, status, and page.
- Add row/card navigation to campaign detail.

## Acceptance Criteria

- Status chips include text and tone.
- Numeric values use stable currency and rate formatting.
- Pagination is keyboard-operable and keeps URL state in sync.
- Cards/tables do not overflow or squeeze unreadably on small screens.
- Loading, empty, filtered-empty, error, retry, forbidden, and partial-data states are covered.

## API Readiness

- Campaign summary list and pagination: `MOCKED` unless a confirmed list endpoint exists.

## Responsive And Accessibility Checks

- Check card grid/table behavior on mobile, tablet, laptop, and wide desktop.
- Verify campaign cards and row actions have accessible names and visible focus.
- Run AXE on populated campaign list state.

## Handoff Requirements

- Record mock data shape, pagination assumptions, route/query behavior, and screenshots/visual review notes.
