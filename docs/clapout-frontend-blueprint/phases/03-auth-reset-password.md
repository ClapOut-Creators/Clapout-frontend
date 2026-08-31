# Phase 03 - Auth Reset Password

## Goal

Build the forgot-password/reset handoff path with clear user feedback and safe navigation back to sign-in.

## Routes / Screens

- `/auth/forgot-password`
- Optional `/auth/reset-password` only if a confirmed provider contract requires a frontend reset form.

## PDF Reference

- Page 1 includes the "Forgot password?" entry point. No separate reset template is shown, so match the sign-in visual language.

## Scope

- Implement forgot-password form with email validation, submit loading state, success confirmation, retry, and return-to-sign-in action.
- Keep the response non-enumerating: do not reveal whether an email exists.
- Add provider adapter method for reset request/handoff.
- Preserve safe return URL only when it remains a local route.

## Acceptance Criteria

- Email validation is accessible and announced.
- Success state uses neutral copy: "If an account exists, reset instructions have been sent."
- Recoverable errors keep the email value and expose retry.
- Users can return to `/auth/sign-in`.
- No account-existence signal is exposed in UI, logs, analytics, or mocks.

## API Readiness

- Password reset provider: `MOCKED` until the identity provider contract is confirmed.

## Responsive And Accessibility Checks

- Check mobile, tablet, laptop, and wide desktop layouts.
- Verify focus moves to the success/error summary after submit.
- Run AXE on `/auth/forgot-password`.

## Handoff Requirements

- Record provider assumptions, copy decisions, commands run, and any reset-token route deferrals.
