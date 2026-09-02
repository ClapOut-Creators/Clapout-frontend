import { Routes } from '@angular/router';
import { adminGuard } from '../../core/auth/admin-guard';

/** Public discovery: no guard, no session required. */
export const CAMPAIGN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/campaign-list/campaign-list').then((module) => module.CampaignList),
    title: 'Campaigns - ClapOut Studio',
  },
  {
    path: ':slug',
    loadComponent: () =>
      import('./pages/campaign-detail/campaign-detail').then((module) => module.CampaignDetail),
    title: 'Campaign - ClapOut Studio',
  },
];

/** Everything below `/admin/campaigns` requires a signed-in user with role ADMIN. */
export const CAMPAIGN_ADMIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin-campaigns/admin-campaigns').then((module) => module.AdminCampaigns),
    title: 'Campaigns - ClapOut Studio',
  },
  {
    path: 'new',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/campaign-wizard/campaign-wizard').then((module) => module.CampaignWizard),
    title: 'Create campaign - ClapOut Studio',
  },
  {
    path: ':slug/edit',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/campaign-wizard/campaign-wizard').then((module) => module.CampaignWizard),
    title: 'Edit campaign - ClapOut Studio',
  },
  {
    path: ':slug',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin-campaign-detail/admin-campaign-detail').then(
        (module) => module.AdminCampaignDetail,
      ),
    title: 'Campaign - ClapOut Studio',
  },
];
