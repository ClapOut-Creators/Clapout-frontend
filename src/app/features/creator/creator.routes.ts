import { Routes } from '@angular/router';
import { CREATOR_DASHBOARD_ROUTES } from '../creators/creators.routes';
import { REGISTRATION_CREATOR_ROUTES } from '../registrations/registrations.routes';

/**
 * Everything below `/creator` needs a signed-in creator. The creators and
 * registrations domains own and guard their own routes now (see each
 * feature's own *.routes.ts) — this file just mounts them at /creator.
 */
export const CREATOR_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  ...CREATOR_DASHBOARD_ROUTES,
  ...REGISTRATION_CREATOR_ROUTES,
];
