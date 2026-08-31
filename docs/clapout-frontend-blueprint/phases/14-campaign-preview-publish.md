# Phase 14 - Campaign Preview And Publish

## Goal

Build the campaign preview page and publish/save-draft decision point.

## Routes / Screens

- `/admin/campaigns/new` preview step.
- `/admin/campaigns/:campaignId/edit` preview step when editing is enabled.

## PDF Reference

- Page 25: campaign preview with edit, save draft, and publish actions.

## Scope

- Render campaign preview from wizard/domain state, including title, description, artwork, budget, CPM/rate, dates, category, platforms, requirements, resources, brand, and last-updated metadata.
- Add edit/back navigation to previous wizard steps.
- Add save draft and publish commands with loading, success, recoverable error, and confirmation where required.
- Correct PDF copy such as "Save draft."

## Acceptance Criteria

- Preview never renders unsanitized HTML or unsafe links.
- Publish is blocked until all required wizard sections are valid.
- Save draft preserves state and reports success without leaving the user uncertain.
- Publish uses a confirmation and recoverable error state.
- Admin-only publish permission is enforced; brand users submit for review when that route is active.

## API Readiness

- Save draft command: `MOCKED` unless confirmed.
- Publish/submit-for-review command: `MOCKED` or `CONTRACT_READY` according to backend contract.

## Responsive And Accessibility Checks

- Check preview readability on mobile, tablet, laptop, and wide desktop.
- Verify headings, link names, image alt text, focus after command completion, and confirmation dialog accessibility.

## Handoff Requirements

- Record command assumptions, permission/status rules, preview data mapping, and any blocked backend actions.
