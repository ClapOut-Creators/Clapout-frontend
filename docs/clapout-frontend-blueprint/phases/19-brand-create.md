# Phase 19 - Brand Create

## Goal

Build the admin add-brand flow from identity through success confirmation.

## Routes / Screens

- `/admin/brands/new`

## PDF Reference

- Pages 11, 15, 19, and 21: brand details, location, primary contact, and saved success states.

## Scope

- Implement brand identity fields: logo, brand name, website/social link, and industry.
- Implement location fields: country and city.
- Implement primary contact fields: contact name, business email, and phone number.
- Add optional account manager only if the product docs or backend contract require it.
- Add brand-created success screen with view-brand and dashboard/list navigation.
- Correct PDF copy such as "Brand details" and "Enter description."

## Acceptance Criteria

- Required fields validate with accessible messages.
- Email, URL, and phone fields have format validation.
- Logo upload has loading, invalid, remove, replace, and error states where applicable.
- Success screen is reachable only after a successful create/mock transition.
- Created brand can be opened from the success action.

## API Readiness

- Brand create command: `MOCKED` unless a confirmed endpoint exists.
- Country/city options: `MOCKED` unless a location source is confirmed.
- Logo upload: `MOCKED` or `BLOCKED` according to storage contract.

## Responsive And Accessibility Checks

- Check form and success screen on mobile, tablet, laptop, and wide desktop.
- Verify upload, select, input labels/errors, focus after validation, and success focus placement.

## Handoff Requirements

- Record brand create DTO assumptions, validation rules, upload/storage status, and success navigation behavior.
