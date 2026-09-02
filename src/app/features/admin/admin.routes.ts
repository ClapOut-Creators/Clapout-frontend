import { Routes } from '@angular/router';
import { adminGuard } from '../../core/auth/admin-guard';

/** Everything below `/admin` requires a signed-in user with role ADMIN. */
export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin-dashboard').then((module) => module.AdminDashboard),
    title: 'Admin dashboard - ClapOut Studio',
  },
  /**
   * The registrations, brands and campaigns domains own and guard their own
   * admin routes now (see each feature's own *.routes.ts) — this file just
   * mounts them at /admin/registrations, /admin/brands and /admin/campaigns.
   */
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
