# Phase 18 - Brands List

## Goal

Build the admin brand directory with metrics, search/filter/pagination, and create-brand entry.

## Routes / Screens

- `/admin/brands`

## PDF Reference

- Pages 8 and 9: brands list variants with metrics and brand table.

## Scope

- Add brand metrics for total brands, active campaigns, and needs attention.
- Add brand directory table with brand, email, industry, phone, country, owner, status, and view action.
- Add search, filters as needed, server-oriented pagination, loading, empty, filtered-empty, error, retry, and forbidden states.
- Correct copy such as "Add brand", "Active campaigns", and "Manage brand accounts, contacts, and campaign activity."

## Acceptance Criteria

- Brand table is usable at supported widths with priority columns or card fallback.
- Search/filter/page state is shareable in URL query params.
- View action routes to brand detail.
- Create brand action is admin-only.
- Personal/contact data is not exposed outside admin scope.

## API Readiness

- Brand list, metrics, and pagination: `MOCKED`.

## Responsive And Accessibility Checks

- Check mobile, tablet, laptop, and wide desktop table/card behavior.
- Verify table header semantics, pagination labels, row/action focus, and AXE.

## Handoff Requirements

- Record brand summary model, metric assumptions, privacy notes, and route/query contract.
