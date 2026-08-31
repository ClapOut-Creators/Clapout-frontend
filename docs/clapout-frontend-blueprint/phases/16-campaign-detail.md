# Phase 16 - Campaign Detail

## Goal

Build campaign detail states with performance overview and registered creators/registrations.

## Routes / Screens

- `/admin/campaigns/:campaignId`
- `/brand/campaigns/:campaignId` read/write behavior only within brand permissions.

## PDF Reference

- Pages 6, 7, 17, and 18: active/rejected campaign detail variants, registered creators table, and empty registration state.

## Scope

- Render detail header, status, action bar, campaign brief, artwork, metadata, resources, performance overview, and registrations table.
- Support active, rejected/changes-requested, awaiting-review, paused, closed, and missing-entity states according to product docs.
- Add edit, resubmit/submit, pause, close, duplicate, and export actions only when permitted and status-valid.
- Use "Registration" and "Creator" language unless a branded copy decision changes it.

## Acceptance Criteria

- Missing campaign shows stable 404 state inside the shell.
- Rejected/changes-requested state explains reason and next action.
- Registration table has loading, empty, filtered-empty, error, retry, partial-data, and forbidden states.
- Status transitions absent or disabled with explanations when invalid.
- Brand users cannot access another brand campaign.

## API Readiness

- Campaign detail: `MOCKED`.
- Campaign actions: `MOCKED` or `CONTRACT_READY` per confirmed endpoint.
- Registration list: `MOCKED`.

## Responsive And Accessibility Checks

- Check detail page at mobile, tablet, laptop, and wide desktop widths.
- Verify table/card fallback, action menu keyboard behavior, status text, image alt text, and destructive confirmation dialogs.

## Handoff Requirements

- Record supported statuses, action-permission matrix, mock detail shape, and API readiness by action.
