# Frontend Architecture and Tools

## Technical baseline

Use the current stable Angular major approved when the repository is scaffolded (Angular 22 at the time of this blueprint) and the matching PrimeNG major. Pin exact versions in the lockfile.

Official references: [Angular releases](https://angular.dev/events/v22), [PrimeNG installation](https://primeng.org/installation), [PrimeNG Tailwind integration](https://primeng.org/tailwind), and [Tailwind with Angular](https://tailwindcss.com/docs/guides/angular).

| Concern | Tool | Purpose |
| --- | --- | --- |
| Framework | Angular, standalone APIs | Application structure, routing, dependency injection, signals |
| Component primitives | PrimeNG | Tables, dialogs, menus, form controls, overlays, pagination, toast |
| Styling | Tailwind CSS v4 | Layout, responsive behavior, spacing, typography, visual composition |
| PrimeNG/Tailwind bridge | `tailwindcss-primeui` | Shared semantic utilities and PrimeNG theme integration |
| Icons | PrimeIcons | Default icon set; use custom SVG only for brand/product artwork |
| Forms | Angular Signal Forms, typed Reactive Forms fallback | Signal-first production forms, type-safe field access, and cross-field validation |
| Local UI state | Angular signals | Filters, wizard state, derived view state, lightweight stores |
| Server state | Typed repositories + `HttpClient` | API access, mapping, request state, mock-to-live replacement |
| Charts | PrimeNG Chart/Chart.js | Dashboard activity and performance charts |
| Dates | date-fns | Formatting and date calculations without global mutation |
| Testing | Vitest + Angular Testing Library | Unit and component behavior |
| E2E | Playwright | Role access and critical workflow coverage |
| API contract | OpenAPI-generated client if available | Prevent contract drift; otherwise hand-written DTO boundary |
| Code quality | ESLint, Prettier, Stylelint optional | Consistency and CI gates |
| Component documentation | Storybook optional in Phase 1 | Visual states for shared components when team capacity allows |

Do not add NgRx for the MVP by default. Introduce it only if cross-feature event coordination becomes difficult after the repository and signal-store patterns are exercised.

## Recommended workspace

This is the canonical feature-first layout for the app. It is also documented in full (with the rationale for each folder) in the repository's `AGENTS.md` and `CLAUDE.md` — keep all three in sync when the structure changes.

```text
src/
  app/
    app.component.ts
    app.config.ts
    app.routes.ts
    core/               # app-wide infrastructure, imported once
      auth/
        guards/
        interceptors/
        services/
        models/
      api/
      errors/
      services/
      models/
    layout/              # app shell only, independent of any feature
      app-shell/
      sidebar/
      header/
      breadcrumbs/
      layout.routes.ts
    shared/               # reusable across two or more domains
      components/
      directives/
      pipes/
      utils/
      constants/
      types/
    features/             # one folder per business domain
      dashboard/
      brands/
      campaigns/
      creators/
      registrations/
      submissions/
      payments/
      analytics/
      team/
      settings/
    ui/                   # dumb, presentation-only primitives
      button/
      card/
      dialog/
      input/
      table/
  assets/
    images/
    icons/
    fonts/
  environments/
    environment.ts
    environment.production.ts
  styles/
    _variables.scss
    _primeng.scss
    _utilities.scss
    styles.scss
  index.html
  main.ts
```

Each feature follows this boundary:

```text
features/campaigns/
  pages/              # routed, top-level views; one folder per route
    campaign-list/
    campaign-details/
    campaign-create/
    campaign-edit/
  components/         # presentational components used only within this feature
    campaign-card/
    campaign-status/
    campaign-summary/
    campaign-form/
  data-access/        # repositories, DTOs, API adapters, mock adapters, stores
    campaign.service.ts
    campaign.api.ts
    campaign.store.ts
    campaign.queries.ts
  models/             # domain models, DTOs, status/enum types for this feature
    campaign.model.ts
    campaign.dto.ts
    campaign-status.ts
  utils/              # pure helpers specific to this feature
    campaign.utils.ts
  campaign.routes.ts
```

Apply this same shape to every domain feature (brands, creators, registrations, submissions, payments, analytics, team, settings), not just campaigns.

## Dependency rules

- `core` may not import feature code.
- `layout` is the app shell only and may not import feature code.
- `shared` may not import feature code or make business API calls; a component belongs in `shared/components` only once it is used by two or more features, otherwise it stays in that feature's own `components/`.
- `ui` holds domain-agnostic presentational primitives (button, card, dialog, input, table) with no business logic; `shared/components` and feature components are composed from `ui` primitives, not the other way around.
- A feature may import `core`, `layout` (read-only, e.g. shell contracts), `shared`, `ui`, and its own folders.
- Cross-feature navigation uses routes and IDs, not direct component imports.
- Cross-feature domain types live in the owning feature's `models/`; truly shared primitives may move to `shared/types`.
- PrimeNG components are wrapped only when ClapOut behavior or styling must be consistent. Do not create empty pass-through wrappers.

## State strategy

Use four distinct state categories:

1. Route state: resource IDs, tabs, filters worth sharing, and pagination belong in URL params/query params.
2. Server state: loaded through repositories in each feature's `data-access/` folder; pages own loading/error/refresh behavior.
3. Form state: Signal Forms preferred for new forms; typed Reactive Forms are acceptable when they are the cleaner fit. Preserve multi-step drafts in a feature-scoped wizard store.
4. UI state: signals for drawers, selection, view mode, and derived totals.

Never store API DTOs directly as editable forms. Map DTO -> domain model -> form value and map the submitted form value into an explicit command.

## API adapter pattern

```ts
export abstract class CampaignRepository {
  abstract list(query: CampaignQuery): Observable<Page<CampaignSummary>>;
  abstract get(publicId: string): Observable<CampaignDetail>;
  abstract create(command: CreateCampaignCommand): Observable<CampaignDetail>;
  abstract update(publicId: string, command: UpdateCampaignCommand): Observable<CampaignDetail>;
}
```

Provide either `HttpCampaignRepository` or `MockCampaignRepository` through dependency injection, defined in the feature's `data-access/` folder. Mock data must be realistic, deterministic, and kept outside components.

## Authentication and authorization

- An auth provider adapter owns sign-in, token/session renewal, and sign-out.
- `authGuard` requires a resolved session.
- `roleGuard` checks route metadata.
- Navigation is generated from the resolved role.
- Server authorization remains authoritative; disabled/hidden UI is not security.
- A `403` page explains missing access; a `401` triggers controlled session recovery.

## Error and feedback contract

- Inline validation for field-specific errors.
- Toast for completed background/user actions.
- Inline page state for data-loading failures with Retry.
- Confirmation dialog for pause, close, reject, suspend, and destructive changes.
- Preserve user input when a recoverable mutation fails.
- API errors map to a stable frontend error model instead of leaking transport payloads.

## Performance

- Lazy-load every role/feature route.
- Use `@defer` for non-critical dashboard charts and secondary panels where it improves first render.
- Use `OnPush` semantics/signals and stable row identity.
- Server-side pagination and filtering for registration and brand tables.
- Responsive images with fixed aspect ratios to avoid layout shift.
- Set a measurable initial JavaScript budget during Phase 0; CI must reject regressions beyond the agreed threshold.
