import { Routes } from '@angular/router';
import { adminGuard } from '../../core/auth/admin-guard';

/** Everything below `/admin/brands` requires a signed-in user with role ADMIN. */
export const BRAND_ADMIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin-brands/admin-brands').then((module) => module.AdminBrands),
    title: 'Brands - ClapOut Studio',
  },
  {
    path: 'new',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/brand-wizard/brand-wizard').then((module) => module.BrandWizard),
    title: 'Create brand - ClapOut Studio',
  },
  {
    path: ':id/edit',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/brand-wizard/brand-wizard').then((module) => module.BrandWizard),
    title: 'Edit brand - ClapOut Studio',
  },
  {
    path: ':id',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin-brand-detail/admin-brand-detail').then(
        (module) => module.AdminBrandDetail,
      ),
    title: 'Brand - ClapOut Studio',
  },
];
