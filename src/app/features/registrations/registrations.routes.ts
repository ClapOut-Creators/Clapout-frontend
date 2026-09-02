import { Routes } from '@angular/router';
import { adminGuard } from '../../core/auth/admin-guard';
import { creatorGuard } from '../../core/auth/creator-guard';

/** Mounted under `/creator` by features/creator/creator.routes.ts. */
export const REGISTRATION_CREATOR_ROUTES: Routes = [
  {
    path: 'campaigns/:slug/apply',
    canActivate: [creatorGuard],
    loadComponent: () =>
      import('./pages/campaign-apply/campaign-apply').then((module) => module.CampaignApply),
    title: 'Apply to campaign - ClapOut Studio',
  },
];

/** Everything below `/admin/registrations` requires a signed-in user with role ADMIN. */
export const REGISTRATION_ADMIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin-registrations/admin-registrations').then(
        (module) => module.AdminRegistrations,
      ),
    title: 'Registered clippers - ClapOut Studio',
  },
];
