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
    path: 'submissions',
    canActivate: [creatorGuard],
    loadComponent: () =>
      import('./creator-submissions').then((module) => module.CreatorSubmissions),
    title: 'Your submissions - ClapOut Studio',
  },
  {
    path: 'campaigns/:slug/apply',
    canActivate: [creatorGuard],
    loadComponent: () => import('./campaign-apply').then((module) => module.CampaignApply),
    title: 'Apply to campaign - ClapOut Studio',
  },
  {
    path: 'campaigns/:slug/submit',
    canActivate: [creatorGuard],
    loadComponent: () => import('./submit-clip').then((module) => module.SubmitClip),
    title: 'Submit your clip - ClapOut Studio',
  },
];
