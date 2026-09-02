import { Routes } from '@angular/router';
import { creatorGuard } from '../../core/auth/creator-guard';
import { REGISTRATION_CREATOR_ROUTES } from '../registrations/registrations.routes';

/** Everything below `/creator` needs a signed-in creator. */
export const CREATOR_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    canActivate: [creatorGuard],
    loadComponent: () => import('./creator-dashboard').then((module) => module.CreatorDashboard),
    title: 'Your dashboard - ClapOut Studio',
  },
  // The registrations domain owns and guards this route (see
  // features/registrations/registrations.routes.ts#REGISTRATION_CREATOR_ROUTES).
  ...REGISTRATION_CREATOR_ROUTES,
];
