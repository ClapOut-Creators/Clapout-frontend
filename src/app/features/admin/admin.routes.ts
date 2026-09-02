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
  {
    path: 'brands',
    pathMatch: 'full',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin-brands').then((module) => module.AdminBrands),
    title: 'Brands - ClapOut Studio',
  },
  {
    path: 'brands/new',
    canActivate: [adminGuard],
    loadComponent: () => import('./brand-wizard').then((module) => module.BrandWizard),
    title: 'Create brand - ClapOut Studio',
  },
  {
    path: 'brands/:id/edit',
    canActivate: [adminGuard],
    loadComponent: () => import('./brand-wizard').then((module) => module.BrandWizard),
    title: 'Edit brand - ClapOut Studio',
  },
  {
    path: 'brands/:id',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin-brand-detail').then((module) => module.AdminBrandDetail),
    title: 'Brand - ClapOut Studio',
  },
  /**
   * The campaigns domain owns and guards its own admin routes now (see
   * features/campaigns/campaigns.routes.ts#CAMPAIGN_ADMIN_ROUTES) — this file
   * just mounts them at /admin/campaigns.
   */
  {
    path: 'campaigns',
    loadChildren: () =>
      import('../campaigns/campaigns.routes').then((module) => module.CAMPAIGN_ADMIN_ROUTES),
  },
];
