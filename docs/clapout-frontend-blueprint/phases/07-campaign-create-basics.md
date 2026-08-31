# Phase 07 - Campaign Create Basics

## Goal

Start the campaign builder with campaign banner/artwork upload, title, and preview language.

## Routes / Screens

- `/admin/campaigns/new`
- `/brand/campaigns/new` only if brand-user creation has been authorized for this phase.

## PDF Reference

- Page 5: "Create New Campaign" basics step with campaign banner upload and title.

## Scope

- Add wizard shell entry state for campaign creation.
- Implement banner upload control, preview area, title field, validation, and continue action.
- Store draft basics in a feature-scoped wizard state.
- Add upload loading, invalid type/size, replace, remove, and retry states.
- Correct PDF copy such as "Format" and campaign-specific helper text.

## Acceptance Criteria

- Required title and banner validation are accessible.
- Upload control supports keyboard operation and clear error messages.
- Draft state survives route-safe navigation according to the wizard persistence decision.
- Continue is blocked until required basics are valid.
- Unsaved-change guard is active once the user edits the wizard.

## API Readiness

- Campaign draft persistence: `MOCKED` until create/update endpoints are confirmed.
- File upload: `MOCKED` or `BLOCKED` depending on backend/upload contract.

## Responsive And Accessibility Checks

- Check form width, preview aspect ratio, and sticky actions on mobile, tablet, laptop, and wide desktop.
- Verify upload labeling, error announcements, keyboard flow, and focus after validation failure.

## Handoff Requirements

- Record wizard state strategy, upload assumptions, validation rules, and route ownership.
