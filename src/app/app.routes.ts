import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'campaigns' },
  {
    path: 'campaigns',
    loadChildren: () =>
      import('./features/campaigns/campaigns.routes').then((module) => module.CAMPAIGN_ROUTES),
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((module) => module.AUTH_ROUTES),
  },
  {
    path: 'creator',
    loadChildren: () =>
      import('./features/creator/creator.routes').then((module) => module.CREATOR_ROUTES),
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes').then((module) => module.ADMIN_ROUTES),
  },
  {
    path: 'terms',
    loadComponent: () => import('./features/legal/legal-page').then((m) => m.LegalPage),
    data: { title: 'Terms of Service' },
    title: 'Terms of Service - ClapOut',
  },
  {
    path: 'privacy',
    loadComponent: () => import('./features/legal/legal-page').then((m) => m.LegalPage),
    data: { title: 'Privacy Policy' },
    title: 'Privacy Policy - ClapOut',
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./features/forbidden/forbidden').then((route) => route.Forbidden),
    title: 'No access - ClapOut Studio',
  },
  {
    path: 'foundation',
    loadComponent: () =>
      import('./features/foundation/foundation-home').then((route) => route.FoundationHome),
    title: 'ClapOut Studio - Foundation',
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found').then((route) => route.NotFound),
    title: 'Page not found - ClapOut Studio',
  },
];
