# Phase 09 - Campaign Budget Step

## Goal

Capture campaign currency, budget, rate, and rate unit with clear calculation semantics.

## Routes / Screens

- `/admin/campaigns/new` budget step.
- Edit route reuse when campaign editing is enabled.

## PDF Reference

- Page 16: "Campaign Budget" step.

## Scope

- Add currency, campaign budget, rate, and views/rate-unit fields.
- Use PrimeNG number/currency-capable controls where suitable.
- Add derived calculation preview for estimated payout math.
- Validate positive values, currency support, and budget/rate consistency.
- Do not imply an automated payout will execute.

## Acceptance Criteria

- Currency defaults to GHS unless configuration says otherwise.
- Amounts and CPM/rate units format consistently.
- Invalid, zero, negative, and overly large values have clear validation.
- Derived values use `computed()` or equivalent pure state.
- The frontend preview is labeled as non-authoritative.

## API Readiness

- Budget/rate draft fields: `MOCKED`.
- Server payout calculation: `BLOCKED` or `CONTRACT_READY` according to backend availability.

## Responsive And Accessibility Checks

- Check mobile, tablet, laptop, and wide desktop field layout.
- Verify screen-reader labels include currency/rate context and error text.

## Handoff Requirements

- Record calculation formula, rounding assumptions, currency assumptions, and API readiness.
