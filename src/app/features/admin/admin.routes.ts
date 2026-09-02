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
  {
    path: 'registrations',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./admin-registrations').then((module) => module.AdminRegistrations),
    title: 'Registered clippers - ClapOut Studio',
  },
  /**
   * The brands and campaigns domains own and guard their own admin routes
   * now (see features/brands/brands.routes.ts#BRAND_ADMIN_ROUTES and
   * features/campaigns/campaigns.routes.ts#CAMPAIGN_ADMIN_ROUTES) — this
   * file just mounts them at /admin/brands and /admin/campaigns.
   */
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
