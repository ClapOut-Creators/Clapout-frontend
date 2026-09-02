import { Routes } from '@angular/router';

/**
 * Everything below `/admin` requires a signed-in user with role ADMIN. Every
 * domain owns and guards its own admin routes now (see each feature's own
 * *.routes.ts) — this file just mounts them at their /admin/* prefixes.
 */
export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('../dashboard/dashboard.routes').then((module) => module.DASHBOARD_ADMIN_ROUTES),
  },
  {
    path: 'registrations',
    loadChildren: () =>
      import('../registrations/registrations.routes').then(
        (module) => module.REGISTRATION_ADMIN_ROUTES,
      ),
  },
  {
    path: 'brands',
    loadChildren: () =>
      import('../brands/brands.routes').then((module) => module.BRAND_ADMIN_ROUTES),
  },
  {
    path: 'campaigns',
    loadChildren: () =>
      import('../campaigns/campaigns.routes').then((module) => module.CAMPAIGN_ADMIN_ROUTES),
  },
];
