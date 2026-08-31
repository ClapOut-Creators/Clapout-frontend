# Phase 20 - Brand Detail

## Goal

Build the admin brand detail workspace with contacts, metrics, campaigns, and create-campaign context.

## Routes / Screens

- `/admin/brands/:brandId`
- Brand-user profile/dashboard reuse only where explicitly authorized.

## PDF Reference

- Page 10: brand detail header, primary contact, account manager, metrics, and campaign list.

## Scope

- Render brand header, logo, industry, status, primary contact, account manager, metrics, campaign list, recent registrations/activity where supported.
- Add create-campaign action that preselects the current brand.
- Add edit, suspend/reactivate/archive actions only when status and permissions allow.
- Add missing-entity and forbidden states.

## Acceptance Criteria

- Brand detail uses internal route ID safely and does not leak unauthorized brand data.
- Create campaign from brand detail carries the correct brand context into the campaign builder.
- Metrics distinguish registrations, creators accepted, and campaigns.
- Campaign list has loading, empty, filtered-empty, error, retry, and responsive states.
- Brand status changes do not silently unpublish campaigns.

## API Readiness

- Brand detail, metrics, contacts, and campaigns: `MOCKED`.
- Brand status commands: `MOCKED`, `CONTRACT_READY`, or `BLOCKED` per backend support.

## Responsive And Accessibility Checks

- Check mobile, tablet, laptop, and wide desktop detail layout.
- Verify contact links, action menus, campaign list/card fallback, destructive confirmations, and focus behavior.

## Handoff Requirements

- Record brand context passing, status rules, API readiness by command, and ownership/permission assumptions.
