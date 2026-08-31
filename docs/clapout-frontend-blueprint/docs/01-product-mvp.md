# Product MVP

## Product outcome

ClapOut Studio must allow ClapOut to run the complete frontend campaign workflow:

1. An admin creates or selects a brand.
2. An admin or brand user creates a campaign draft.
3. ClapOut reviews and publishes the campaign.
4. Creators discover and register for the campaign.
5. Admins inspect each registration and make a decision.
6. Accepted creators submit content links.
7. Admins record verified views and prepare the amount due.
8. Every user can see an accurate status and next action.

## MVP actors

| Actor | Primary goal | MVP boundary |
| --- | --- | --- |
| Admin | Run campaign operations | Full access to brands, campaigns, registrations, review, verification, and payout preparation |
| Brand user | Prepare campaigns and observe results | Own brand only; cannot approve or publish |
| Creator | Find paid opportunities and complete work | Own profile, applications, submissions, and earnings only |

## Core product language

- Use **Creator**, not “Clipper,” in the interface and code unless the business deliberately adopts “Clipper” as a branded term.
- Use **Registration** for a creator's application to one campaign.
- Use **Accepted registration** for a campaign-level decision.
- Use **Unique creator** only when deduplicating people across campaigns.
- Every campaign must have exactly one `brandId`, including a ClapOut-owned campaign.

## MVP feature map

### Shared foundation

- Sign in, sign out, forgot-password handoff, session recovery
- Role-aware routing and navigation
- Profile and settings
- Notifications/toasts, confirmation dialogs, loading, empty, error, and permission states
- Responsive application shell

### Admin workspace

- Operations dashboard with published campaigns, new registrations, awaiting review, creators, brands, activity, and attention queue
- Campaign list with search, filters, status tabs, pagination, empty state, and cards/table responsive views
- Multi-step campaign builder, preview, save draft, submit, approve, publish, pause, close, edit, and duplicate
- Campaign detail with performance summary and registrations
- Brand directory, brand creation, brand detail, contacts, campaigns, and recent registrations
- Global registrations list and registration detail workspace
- Registration status decisions and internal notes
- Manual view verification and calculated payout preview
- CSV export trigger and audit/event presentation

### Brand workspace

- Brand dashboard scoped to one brand
- Brand profile and contacts
- Own campaigns and campaign drafts
- Campaign builder and submission for review
- Read-only registrations and campaign performance
- Team access is deferred unless backend support is confirmed

### Creator workspace

- Creator dashboard with next action, deadlines, application status, and recommended campaigns
- Campaign discovery, filters, campaign detail, eligibility messaging, and registration
- Application review and submission
- Application status timeline
- Accepted campaign workspace with brief, resources, deadlines, and content-link submission
- Profile, social accounts, portfolio, notification settings, and payout details
- Earnings summary is informational; automated payout execution is not an MVP frontend capability

## Status models

### Campaign

`DRAFT -> IN_REVIEW -> CHANGES_REQUESTED -> APPROVED -> SCHEDULED/PUBLISHED -> PAUSED -> CLOSED -> ARCHIVED`

Only an admin may approve, publish, pause, close, or archive. A brand user may create, edit, and submit its own drafts.

### Registration

`DRAFT -> SUBMITTED -> UNDER_REVIEW -> SHORTLISTED/WAITLISTED/ACCEPTED/REJECTED -> WITHDRAWN`

Accepted registrations may additionally expose participation states such as `CONTENT_PENDING`, `CONTENT_SUBMITTED`, `VERIFIED`, and `PAYOUT_PENDING` without replacing the application decision.

## Explicitly outside the frontend MVP

- Automated social-platform verification
- Automated payouts or wallet infrastructure
- Advanced analytics and report builders
- Chat and messaging inbox
- Recommendation engine
- Flexible no-code form builder
- Multi-level approval chains
- Native mobile applications
- Full accounting or invoice management

## Resulting frontend deliverable

A deployable Angular single-page application with role-aware lazy routes, a reusable ClapOut design system, typed mock/HTTP data adapters, test coverage for critical workflows, and the complete admin path plus coherent brand and creator paths.

