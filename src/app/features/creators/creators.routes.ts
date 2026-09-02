import { Routes } from '@angular/router';
import { creatorGuard } from '../../core/auth/creator-guard';

/** Mounted under `/creator` by features/creator/creator.routes.ts. */
export const CREATOR_DASHBOARD_ROUTES: Routes = [
  {
    path: 'dashboard',
    canActivate: [creatorGuard],
    loadComponent: () =>
      import('./pages/creator-dashboard/creator-dashboard').then(
        (module) => module.CreatorDashboard,
      ),
    title: 'Your dashboard - ClapOut Studio',
  },
];
