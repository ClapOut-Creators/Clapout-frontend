# PDF Page Map

`../Clapout.pdf` is the visual/page-template baseline. Implementers must use this map to confirm every PDF page is represented by a page phase, even when the PDF page is a duplicate, variant, or flawed template that should be corrected.

| PDF page | Template summary | Phase |
| ---: | --- | --- |
| 1 | Sign-in page with forgot-password entry | `02-auth-sign-in.md`, `03-auth-reset-password.md` |
| 2 | Admin dashboard metrics, activity, attention queue, recent campaigns | `04-admin-dashboard.md` |
| 3 | Campaigns empty state | `05-campaigns-empty-state.md` |
| 4 | Campaigns populated list/cards | `06-campaigns-list.md` |
| 5 | Campaign create basics: banner and title | `07-campaign-create-basics.md` |
| 6 | Active campaign detail with registrations | `16-campaign-detail.md` |
| 7 | Rejected/changes-requested campaign detail and empty registrations | `16-campaign-detail.md` |
| 8 | Brands list with add-brand action | `18-brands-list.md` |
| 9 | Brands list duplicate/variant with incorrect create-campaign action | `18-brands-list.md` |
| 10 | Brand detail with contacts, metrics, and campaigns | `20-brand-detail.md` |
| 11 | Brand create identity step | `19-brand-create.md` |
| 12 | Awaiting-review campaign list variant | `06-campaigns-list.md` |
| 13 | Campaign details builder step | `08-campaign-details-step.md` |
| 14 | Manual verification panel | `17-manual-verification.md` |
| 15 | Brand create location step | `19-brand-create.md` |
| 16 | Campaign budget step | `09-campaign-budget-step.md` |
| 17 | Campaign detail duplicate/variant | `16-campaign-detail.md` |
| 18 | Campaign detail duplicate/variant | `16-campaign-detail.md` |
| 19 | Brand create primary contact step | `19-brand-create.md` |
| 20 | Campaign timeline step | `10-campaign-timeline-step.md` |
| 21 | Brand saved success screen | `19-brand-create.md` |
| 22 | Campaign platforms step | `11-campaign-platforms-step.md` |
| 23 | Campaign requirements and resources step | `12-campaign-requirements-step.md` |
| 24 | Campaign brand/company step | `13-campaign-brand-step.md` |
| 25 | Campaign preview and publish decision point | `14-campaign-preview-publish.md` |
| 26 | Campaign published success screen | `15-campaign-published-success.md` |

## Corrections Required During Implementation

- Treat duplicate pages as state variants, not separate routes unless a phase says otherwise.
- Correct spelling and copy defects such as "Darft", "Views details", "campagin", "descritpion", "Create Brands", and "Total Creators".
- Use "Creator" and "Registration" in product copy unless the business explicitly adopts a different branded term.
- Preserve the bright ClapOut identity, warm canvas, compact operational density, white cards, dark primary actions, campaign artwork, and status chips while improving accessibility and responsiveness.
- Do not let the PDF override the route and permission rules in `04-routes-and-permissions.md`.
