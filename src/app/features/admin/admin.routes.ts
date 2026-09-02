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
  {
    path: 'campaigns',
    pathMatch: 'full',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin-campaigns').then((module) => module.AdminCampaigns),
    title: 'Campaigns - ClapOut Studio',
  },
  {
    path: 'campaigns/new',
    canActivate: [adminGuard],
    loadComponent: () => import('./campaign-wizard').then((module) => module.CampaignWizard),
    title: 'Create campaign - ClapOut Studio',
  },
  {
    path: 'campaigns/:slug/edit',
    canActivate: [adminGuard],
    loadComponent: () => import('./campaign-wizard').then((module) => module.CampaignWizard),
    title: 'Edit campaign - ClapOut Studio',
  },
  {
    path: 'campaigns/:slug',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./admin-campaign-detail').then((module) => module.AdminCampaignDetail),
    title: 'Campaign - ClapOut Studio',
  },
];
