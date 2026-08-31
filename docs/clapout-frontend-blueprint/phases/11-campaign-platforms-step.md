# Phase 11 - Campaign Platforms Step

## Goal

Capture one or more social platforms for the campaign.

## Routes / Screens

- `/admin/campaigns/new` platforms step.
- Edit route reuse when campaign editing is enabled.

## PDF Reference

- Page 22: "Campaign Platforms" step with TikTok, Instagram, Facebook, and YouTube Reel options.

## Scope

- Add multi-select platform step with cards or PrimeNG selection primitive.
- Require at least one selected platform.
- Include platform name, description, and icon/visual cue while keeping text as the primary signal.
- Preserve selections in wizard state.

## Acceptance Criteria

- Users can select and deselect platforms with mouse and keyboard.
- At least one platform is required before continuing.
- Selection state is visible, announced, and not color-only.
- Platform options come from a typed config/repository mock, not inline component literals.

## API Readiness

- Platform options and campaign platform draft fields: `MOCKED`.

## Responsive And Accessibility Checks

- Check option layout on mobile, tablet, laptop, and wide desktop.
- Verify selection roles/states, focus rings, and error announcement.

## Handoff Requirements

- Record platform option model, validation rule, and any deferred platform taxonomy contract.
