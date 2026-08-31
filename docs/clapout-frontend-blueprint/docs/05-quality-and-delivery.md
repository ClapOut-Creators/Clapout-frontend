# Quality and Delivery Contract

## Definition of done

A feature is complete when:

- Acceptance criteria pass with mock and HTTP adapters where available.
- Loading, empty, filtered-empty, error, retry, success, and permission states exist.
- Desktop, tablet, and mobile layouts have been checked.
- Keyboard navigation and accessible names have been checked.
- User-facing copy matches the shared vocabulary.
- Unit/component tests cover status and validation rules.
- A Playwright test covers the critical happy path when the feature participates in one.
- No console errors, unhandled promise/observable errors, or failed network requests remain.
- Documentation and the phase checklist are updated.

## Required CI gates

```text
install with frozen lockfile
format check
lint
type check / production build
unit and component tests
Playwright critical-path suite
bundle budget check
```

## Critical E2E scenarios

1. Admin sign-in -> add brand -> create campaign -> preview -> publish.
2. Creator sign-in -> discover campaign -> register -> view submitted status.
3. Admin -> open registration -> accept creator -> status history updates.
4. Accepted creator -> submit content link.
5. Admin -> record verified views -> calculated amount is displayed.
6. Brand user cannot publish; creator cannot open admin URLs.
7. Expired session recovers or signs out without losing an explicitly persisted draft.

## Review gates between phases

At the end of every phase, record:

- Completed scope
- Commands run and results
- Screens/routes added
- Deviations from the blueprint and why
- Known issues
- API assumptions still mocked
- Screenshots or preview location
- Explicit recommendation: proceed or hold

The next phase must read this handoff before editing code.

## API readiness markers

Use one of these tags in phase handoffs:

- `MOCKED`: no confirmed backend contract
- `CONTRACT_READY`: DTOs/endpoints confirmed but not integrated
- `INTEGRATED`: live adapter implemented
- `BLOCKED`: backend capability is required to continue

## Product analytics events

Define names centrally and keep payloads free of sensitive personal data:

- `auth_sign_in_succeeded`
- `campaign_draft_created`
- `campaign_submitted`
- `campaign_published`
- `registration_submitted`
- `registration_status_changed`
- `content_link_submitted`
- `views_verified`

