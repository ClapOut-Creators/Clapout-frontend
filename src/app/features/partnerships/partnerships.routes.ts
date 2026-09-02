import { Routes } from '@angular/router';
import { adminGuard } from '../../core/auth/admin-guard';

/** Everything below `/admin/partnerships` requires a signed-in user with role ADMIN. */
export const PARTNERSHIP_ADMIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/partnerships-overview/partnerships-overview').then(
        (module) => module.PartnershipsOverview,
      ),
    title: 'Partnerships - ClapOut Studio',
  },
  {
    path: ':inquiryId',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/partnership-detail/partnership-detail').then(
        (module) => module.PartnershipDetail,
      ),
    title: 'Partnership inquiry - ClapOut Studio',
  },
];
