# ClapOut Design System

## Reference intent

`Clapout.pdf` is the visual baseline, not a pixel-perfect implementation contract. Preserve its bright orange ClapOut identity, warm neutral canvas, compact sidebar, white operational cards, dark primary actions, campaign artwork, and status chips. Improve inconsistencies in wording, alignment, form density, empty states, and accessibility during implementation.

## Visual principles

- Orange communicates ClapOut identity and the principal action; do not flood entire admin pages with orange.
- White cards on a warm off-white canvas separate operational groups.
- Near-black text and actions provide contrast and maturity.
- Creator pages may be more visual and campaign-led; admin pages remain information-dense.
- One primary action per page header.
- Status must always include text and must never rely on color alone.

## Token categories

Define tokens before building feature pages:

- Brand: `primary`, `primary-hover`, `primary-contrast`
- Surface: `canvas`, `card`, `subtle`, `overlay`
- Text: `strong`, `default`, `muted`, `inverse`
- Border: `default`, `strong`, `focus`
- Semantic: `success`, `warning`, `danger`, `info`
- Spacing: 4px base scale
- Radius: input, card, pill, modal
- Shadow: card and overlay only
- Typography: display, heading, body, label, caption, numeric metric

Map these tokens into both PrimeNG's semantic theme preset and Tailwind utilities. Avoid page-specific hex values.

## Shared component inventory

- `AppShell`, `RoleNavigation`, `PageHeader`, `Breadcrumbs`
- `MetricCard`, `AttentionItem`, `ActivityChart`
- `StatusBadge`, `EmptyState`, `ErrorState`, `SkeletonBlock`
- `CampaignCard`, `CampaignTable`, `CampaignArtwork`
- `FilterBar`, `SearchField`, `PaginationSummary`
- `DataTableShell`, `ResponsiveTableCard`
- `FormField`, `FormSection`, `WizardShell`, `StepActions`
- `DetailHeader`, `DefinitionList`, `ActivityTimeline`
- `ConfirmActionDialog`, `EntityActionMenu`
- `FileUploader`, `ImageUploader`, `ExternalLinkField`
- `MoneyValue`, `DateRange`, `PlatformIconList`

## Responsive rules

- Admin is desktop-first at 1280px and above.
- The sidebar collapses to icons at medium widths and becomes a drawer on mobile.
- Dense tables switch to priority-column cards or controlled horizontal scrolling; do not squeeze every column.
- The creator experience uses bottom navigation on mobile.
- Multi-step forms use a centered readable column and sticky actions only when they do not cover validation messages.
- Dialogs become full-screen sheets on small screens when the content includes a form.

## Required component states

Every data-driven component must account for:

- Initial loading
- Refreshing
- Empty
- Filtered empty
- Error with retry
- Partial data
- Disabled/permission denied
- Success feedback

## Accessibility baseline

- Meet WCAG 2.2 AA contrast and interaction expectations.
- All inputs have programmatic labels, descriptions, and errors.
- Keyboard users can operate menus, dialogs, tables, tabs, date pickers, and upload controls.
- Focus is visible and restored when overlays close.
- Dialog titles and destructive consequences are announced.
- Charts have an adjacent textual summary.
- Respect reduced-motion preferences.

## Copy corrections from the template

- “Published campaign” -> “Published campaigns”
- “Total Creators” -> “Total creators”
- “Create Brands” -> “Add brand”
- “View details,” not “Views details”
- “Draft,” not “Darft”
- “Campaign details,” “Description,” and “Registration” must use consistent spelling
- Replace generic subtitles such as “Tell us about yourself” with page-specific guidance

