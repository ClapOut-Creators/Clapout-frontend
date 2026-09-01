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
- Use the exact `#F9F9F9` dashboard page canvas with white cards.
- Render registration activity through Apache ECharts using the shared chart wrapper.
- Use uploaded SVG assets from `public/icons/` for the signed-in icon rail.

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

## Completion Notes

- [x] Signed-in desktop navbar uses the uploaded compact white icon rail across admin and creator workspaces.
- [x] Icon-only nav controls have accessible names and PrimeNG tooltips.
- [x] Mobile signed-in navigation remains a labelled drawer/topbar.
- [x] Admin dashboard includes metric cards, registration activity, Need Attention, and recent campaigns.
- [x] Dashboard canvas uses exact `#F9F9F9`; cards remain white with compact radius.
- [x] Registration activity chart now uses Apache ECharts via `ngx-echarts`.
- [x] Signed-in sidebar primary icons use uploaded SVG assets from `public/icons/`.
- [x] Loading, empty, error, retry, and status-text states are covered by component tests.
- [x] Dashboard data continues to use existing admin stats/campaign contracts; attention rows are frontend-derived and remain `MOCKED`.
- [ ] Authenticated `/admin/dashboard` browser responsive and AXE pass still needs a signed-in admin session.
