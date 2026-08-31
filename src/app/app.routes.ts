import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/foundation/foundation-home').then((route) => route.FoundationHome),
    title: 'ClapOut Studio - Foundation',
  },
];
