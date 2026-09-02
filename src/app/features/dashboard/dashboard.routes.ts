import { Routes } from '@angular/router';
import { adminGuard } from '../../core/auth/admin-guard';

/** Everything below `/admin/dashboard` requires a signed-in user with role ADMIN. */
export const DASHBOARD_ADMIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin-dashboard/admin-dashboard').then((module) => module.AdminDashboard),
    title: 'Admin dashboard - ClapOut Studio',
  },
];
