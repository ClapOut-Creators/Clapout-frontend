import { Routes } from '@angular/router';
import { creatorGuard } from '../../core/auth/creator-guard';

/** Everything below `/creator` needs a signed-in creator. */
export const CREATOR_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    canActivate: [creatorGuard],
    loadComponent: () => import('./creator-dashboard').then((module) => module.CreatorDashboard),
    title: 'Your dashboard - ClapOut Studio',
  },
  {
    path: 'campaigns/:slug/apply',
    canActivate: [creatorGuard],
    loadComponent: () => import('./campaign-apply').then((module) => module.CampaignApply),
    title: 'Apply to campaign - ClapOut Studio',
  },
];
