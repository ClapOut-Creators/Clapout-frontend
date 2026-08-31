# Phase 04 - Admin Dashboard

## Goal

Deliver the admin dashboard overview with metrics, registration activity, attention queue, and recent campaigns.

## Routes / Screens

- `/admin/dashboard`

## PDF Reference

- Page 2: dashboard metrics, activity chart, attention queue, recent campaign list.

## Scope

- Build admin dashboard layout inside the application shell.
- Add metric cards for published campaigns, new registrations, awaiting review, total creators, and total brands.
- Add registration activity chart with textual summary for accessibility.
- Add attention queue with awaiting review, ending soon, pending budget, and reports requiring action.
- Add recent campaigns table/list with loading, empty, error, and retry states.
- Correct copy such as "Published campaigns", "Total creators", and "View details."

## Acceptance Criteria

- Metrics use unambiguous labels and stable number formatting.
- Chart has a non-visual text summary.
- Attention items are keyboard-operable links or buttons with clear destinations.
- Recent campaigns show status text and do not rely on color alone.
- Admin-only route metadata and guard behavior are in place.

## API Readiness

- Dashboard metrics, activity, attention queue, and recent campaigns: `MOCKED` unless confirmed dashboard endpoints exist.

## Responsive And Accessibility Checks

- Check desktop-first admin density at 1280px and above, plus tablet and mobile stacking.
- Verify keyboard order through page actions, chart summary, attention queue, and campaign rows.
- Run AXE on `/admin/dashboard`.

## Handoff Requirements

- Record dashboard data assumptions, chart library/component choice, visual states checked, and API readiness per dashboard section.
