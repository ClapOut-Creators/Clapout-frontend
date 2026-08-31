# Phase 13 - Campaign Brand Step

## Goal

Attach or capture the brand/company details used by the campaign preview.

## Routes / Screens

- `/admin/campaigns/new` brand step.
- `/brand/campaigns/new` should preselect the signed-in brand when brand-user creation is active.

## PDF Reference

- Page 24: "Brand Details" step for the campaign preview.

## Scope

- Allow admin to select an existing brand or enter the minimum brand details required by the current mock flow.
- Include logo, company name, and brand identity fields needed by the preview.
- Preserve one-brand-per-campaign invariant.
- Prevent brand users from selecting or editing another brand.

## Acceptance Criteria

- Admin path requires exactly one brand before preview/publish.
- Brand-user path, when enabled, uses the user's own brand and blocks URL/data manipulation.
- Logo upload/selection has loading, invalid, remove, replace, and error states where applicable.
- Preview receives normalized brand data, not raw form state.

## API Readiness

- Brand selection/list: `MOCKED` unless confirmed brand endpoint exists.
- Brand logo upload: `MOCKED` or `BLOCKED` according to storage contract.

## Responsive And Accessibility Checks

- Check brand form and upload preview on mobile, tablet, laptop, and wide desktop.
- Verify labels, upload control, error text, and focus after validation failure.

## Handoff Requirements

- Record brand ownership assumptions, mock brand data shape, and any admin-vs-brand-user differences.
