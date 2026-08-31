# Phase 02 - Auth Sign In

## Goal

Build `/auth/sign-in` and session bootstrap so users can enter the correct role workspace without exposing protected UI.

## Routes / Screens

- `/auth/sign-in`
- Default post-login redirect for `ADMIN`, `BRAND`, and `CREATOR`.
- Sign-out entry point if needed to verify state cleanup.

## PDF Reference

- Page 1: sign-in page visual template.

## Scope

- Implement sign-in page with email, password, remember-me, forgot-password link, submit loading state, field validation, and form-level error.
- Add auth provider adapter boundary for mock/live sign-in, sign-out, session recovery, and role resolution.
- Add safe return URL handling and role-derived dashboard redirect.
- Add analytics event placeholder for `auth_sign_in_succeeded` without sensitive payloads.
- Correct PDF copy to "Sign in to manage campaigns, registrations, and payouts."

## Acceptance Criteria

- Invalid email/password fields show accessible inline errors.
- Submit button exposes pending and disabled states without losing entered values.
- Successful mock sign-in lands each role on its own dashboard.
- Unknown session shows a bootstrap/loading state rather than login or protected-content flash.
- Direct protected URL returns to the requested safe route after sign-in.
- Sign-out clears private view state.

## API Readiness

- Auth provider: `MOCKED` until a real identity provider contract exists.
- User/session shape: `MOCKED` or `CONTRACT_READY` according to confirmed backend/auth details.

## Responsive And Accessibility Checks

- Check sign-in at mobile, tablet, laptop, and wide desktop widths.
- Verify labels, password visibility control, remember-me checkbox, error announcements, keyboard submit, and focus order.
- Run AXE on `/auth/sign-in`.

## Handoff Requirements

- Record auth assumptions, mock user roles, redirect behavior, commands run, and screenshots/preview route.
- Recommend `PROCEED` only when role bootstrap is reliable enough for protected page phases.
