# Routes and Permissions

## Route map

```text
/auth/sign-in
/auth/forgot-password
/forbidden

/admin/dashboard
/admin/campaigns
/admin/campaigns/new
/admin/campaigns/:campaignId
/admin/campaigns/:campaignId/edit
/admin/registrations
/admin/registrations/:registrationId
/admin/brands
/admin/brands/new
/admin/brands/:brandId
/admin/profile
/admin/settings

/brand/dashboard
/brand/campaigns
/brand/campaigns/new
/brand/campaigns/:campaignId
/brand/campaigns/:campaignId/edit
/brand/registrations
/brand/profile
/brand/settings

/creator/dashboard
/creator/campaigns
/creator/campaigns/:campaignId
/creator/campaigns/:campaignId/apply
/creator/applications
/creator/applications/:registrationId
/creator/participation/:registrationId
/creator/profile
/creator/settings
```

## Permission matrix

| Capability | Admin | Brand user | Creator |
| --- | ---: | ---: | ---: |
| View platform dashboard | Yes | No | No |
| Manage brands | Yes | Own brand profile only | No |
| Create campaign draft | Yes | Own brand | No |
| Edit draft/changes-requested campaign | Yes | Own brand | No |
| Approve or publish campaign | Yes | No | No |
| Pause/close campaign | Yes | No | No |
| View registrations | All | Own campaigns, read-only | Own only |
| Change registration decision | Yes | No in MVP | No |
| Add internal notes | Yes | No | No |
| Submit application | No | No | Yes |
| Submit content link | No | No | Accepted creator only |
| Verify views | Yes | No | No |
| View payout amount | Yes | Campaign summary only | Own amount only |

## Navigation

### Admin

Dashboard, Campaigns, Registrations, Brands, Profile, Settings

### Brand

Overview, Campaigns, Registrations, Brand profile, Settings

### Creator

Home, Discover, Applications, Earnings, Profile

## Guard behavior

- Unknown session: show application bootstrap, not a login flash.
- Signed out: redirect to `/auth/sign-in` with a safe return URL.
- Wrong role: redirect to `/forbidden`; do not silently redirect to an unrelated dashboard.
- Missing entity: show a stable 404 state within the shell.
- Brand ownership mismatch: treat as forbidden even if the entity ID exists.
- Unsaved wizard changes: show a navigation confirmation.

## Route data

Every protected route must declare permitted roles and a page title. Breadcrumb labels come from route configuration or resolved entity names, not duplicated strings inside pages.

