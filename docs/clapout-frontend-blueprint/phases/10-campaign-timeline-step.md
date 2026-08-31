# Phase 10 - Campaign Timeline Step

## Goal

Capture the campaign start and end dates with accessible date selection and validation.

## Routes / Screens

- `/admin/campaigns/new` timeline step.
- Edit route reuse when campaign editing is enabled.

## PDF Reference

- Page 20: "Campaign Timeline" date picker template.

## Scope

- Implement date range selection using PrimeNG DatePicker or an accessible equivalent.
- Add validation for required dates, start before end, and policy-defined minimum/maximum dates.
- Display selected date range in readable format without relying on globals in templates.
- Add back/continue actions connected to wizard state.
- Correct broken PDF date picker presentation into an accessible, responsive calendar.

## Acceptance Criteria

- Keyboard users can open, navigate, select, and close the date picker.
- Invalid ranges are blocked with clear errors.
- Timezone/date formatting behavior is explicit and tested.
- Back/continue preserves valid date state.

## API Readiness

- Campaign timeline fields: `MOCKED`.
- Business date policy: `MOCKED` unless backend contract confirms allowed ranges.

## Responsive And Accessibility Checks

- Check date picker on mobile, tablet, laptop, and wide desktop.
- Verify focus trap/return behavior for overlays and AXE date-picker coverage.

## Handoff Requirements

- Record date policy assumptions, timezone handling, and PrimeNG date picker accessibility notes.
