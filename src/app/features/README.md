# Feature Boundary

Lazy-routed product domains live here, organized feature-first (see `docs/clapout-frontend-blueprint/docs/02-frontend-architecture.md`): `auth`, `brands`, `campaigns`, `creator` (thin role-prefix aggregator), `creators` (creator profile/dashboard), `dashboard`, `registrations`. Each feature owns `pages/`, `components/`, `data-access/`, `models/`, and `utils/` as needed — not every feature needs all five.

`admin` and `creator` are role-prefix route aggregators only: each has just a `*.routes.ts` that mounts every domain's own admin/creator routes at the right URL prefix. They hold no pages, components, or data-access of their own — each domain owns and guards its own admin/creator routes.

`forbidden/`, `foundation/`, `legal/`, and `not-found/` are trivial single-file routes and are exempt from the full `pages/components/data-access/models/utils` scaffold until they grow beyond one concern.

Features may import core and shared code, but cross-feature navigation should use routes and IDs, not direct reach-ins to another feature's internals.
