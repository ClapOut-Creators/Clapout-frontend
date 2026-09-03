import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { creatorGuard } from '../../core/auth/creator-guard';

/**
 * `/creator/campaigns/:slug/submit` → `/campaigns/:slug?submit=1`.
 *
 * A guard rather than `redirectTo`, because Angular refuses a route that has
 * both (`NG04014`: redirects run before guards) and this one has to keep
 * {@link creatorGuard} — an anonymous visitor following an old link must sign
 * in with this URL as the returnUrl and only then be bounced on.
 */
const submitRedirect: CanActivateFn = (route) =>
  inject(Router).parseUrl(
    `/campaigns/${encodeURIComponent(String(route.params['slug'] ?? ''))}?submit=1`,
  );

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
    // The standalone submit page is gone: submitting a clip is now an overlay
    // over the signed-in campaign page, opened by `?submit=1`. The old URL is
    // still in the wild (dashboard links, bookmarks), so it redirects rather
    // than 404s. No component: `submitRedirect` always answers with a UrlTree.
    path: 'campaigns/:slug/submit',
    canActivate: [creatorGuard, submitRedirect],
    children: [],
  },
];
