# Phase 08 - Campaign Details Step

## Goal

Capture campaign description, category, and product details in the builder.

## Routes / Screens

- `/admin/campaigns/new` details step.
- `/admin/campaigns/:campaignId/edit` details step when editing is later enabled.

## PDF Reference

- Page 13: "Campaign Details" step.

## Scope

- Add short description, detailed description/content brief, category select, and product select.
- Use PrimeNG text input/textarea/select primitives.
- Add back/continue actions connected to wizard state.
- Keep DTO, domain, and form values separate.
- Correct copy such as "Enter description and select category", "Campaign", and "Description."

## Acceptance Criteria

- Required fields validate on submit/blur according to form policy.
- Category and product values are controlled lists from repository/config mocks.
- Back returns without losing valid entered data.
- Continue maps form value into an explicit draft command/model.

## API Readiness

- Campaign draft details: `MOCKED`.
- Category/product options: `MOCKED` unless a confirmed taxonomy endpoint exists.

## Responsive And Accessibility Checks

- Check mobile, tablet, laptop, and wide desktop form density.
- Verify labels, descriptions, error messages, select keyboard behavior, and focus after errors.

## Handoff Requirements

- Record taxonomy assumptions, validation rules, and wizard state mapping.
