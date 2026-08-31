# Phase 17 - Manual Verification

## Goal

Add manual verified-views entry and payout preview for accepted creator work.

## Routes / Screens

- `/admin/campaigns/:campaignId` verification panel or drawer.
- `/admin/registrations/:registrationId` if a registration detail route is implemented in this phase.

## PDF Reference

- Page 14: manual verification panel and registered creators table process column.

## Scope

- Add verified views input, calculated amount preview, status feedback, and submit/process action.
- Add export trigger state for registered creators if not completed in Phase 16.
- Clearly label frontend calculation as a preview; server response is authoritative.
- Mask personal/payment information unless the current task requires full details.

## Acceptance Criteria

- Calculation uses `verifiedViews / rateUnitViews * rate` for preview and has rounding/currency tests.
- Invalid views values show accessible errors.
- Submit has loading, success, recoverable error, retry, and server-corrected amount states.
- Export shows progress, success, and failure feedback.
- Verification actions are admin-only.

## API Readiness

- Manual verification command: `MOCKED` or `CONTRACT_READY` when backend contract exists.
- Export trigger: `MOCKED` or `BLOCKED` according to backend availability.

## Responsive And Accessibility Checks

- Check panel/drawer/table behavior on mobile, tablet, laptop, and wide desktop.
- Verify keyboard access, focus trap/return, numeric input labels, and confirmation/toast announcements.

## Handoff Requirements

- Record calculation rules, privacy masking decisions, export assumptions, and server-authoritative amount behavior.
