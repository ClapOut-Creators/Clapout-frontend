# Phase 01 - Application Shell

## Goal

Translate the PDF's operational layout into the shared app shell before feature pages are built.

## Routes / Screens

- Protected shell wrapper for admin, brand, and creator workspaces.
- Sidebar, top bar, breadcrumbs, page header, responsive drawer, creator mobile navigation, forbidden page, and not-found state.

## PDF Reference

- Pages 2-4, 6-10, 14, 17-18 show the desktop shell, sidebar density, top page header, breadcrumbs, actions, cards, and tables.

## Scope

- Build shell layout primitives and route outlet structure.
- Generate navigation from resolved role metadata.
- Add development-only component showcase if useful for shell and shared state review.
- Add shared UI primitives needed by the shell: page header, breadcrumbs, status badge, empty state, error state, skeleton block, confirmation host, toast host, and responsive table/card shell.
- Use PrimeNG for drawer, menus, breadcrumbs or equivalent navigation primitives, toast, confirmation, and overlay behavior.
- Use Tailwind and semantic tokens for layout, density, focus, and responsive behavior.

## Acceptance Criteria

- Shell does not flash protected content before session state is known.
- Sidebar collapses at medium widths and becomes a drawer on mobile.
- Creator workspace can use bottom navigation on mobile.
- Page title, breadcrumbs, primary action, and secondary actions have consistent placement.
- Icon-only buttons have accessible names and tooltips.
- No feature-specific API calls exist in shared shell components.

## API Readiness

- Session/role source: `MOCKED` unless an auth provider contract is confirmed.
- Navigation metadata: local frontend configuration.

## Responsive And Accessibility Checks

- Check mobile, tablet, laptop, and wide desktop layouts.
- Verify keyboard navigation through sidebar, drawer, menu, breadcrumbs, and skip/focus order.
- Verify focus restoration when the drawer or menu closes.
- Run AXE against at least one shell route.

## Handoff Requirements

- Record shared components added, shell routes touched, responsive widths checked, and any role/navigation assumptions.
- Recommend `PROCEED` only when the shell can host auth-protected page phases.
