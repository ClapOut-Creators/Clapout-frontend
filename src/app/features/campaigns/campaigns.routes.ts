import { Routes } from '@angular/router';

/** Public discovery: no guard, no session required. */
export const CAMPAIGN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./campaign-list').then((module) => module.CampaignList),
    title: 'Campaigns - ClapOut Studio',
  },
  {
    path: ':slug',
    loadComponent: () => import('./campaign-detail').then((module) => module.CampaignDetail),
    title: 'Campaign - ClapOut Studio',
  },
];
