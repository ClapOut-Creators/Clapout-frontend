import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'sign-in' },
  {
    path: 'sign-in',
    loadComponent: () => import('./pages/sign-in/sign-in').then((module) => module.SignIn),
    title: 'Sign in - ClapOut Studio',
  },
  {
    path: 'sign-up',
    loadComponent: () => import('./pages/sign-up/sign-up').then((module) => module.SignUp),
    title: 'Create your account - ClapOut Studio',
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password').then((module) => module.ForgotPassword),
    title: 'Reset your password - ClapOut Studio',
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password').then((module) => module.ResetPassword),
    title: 'Choose a new password - ClapOut Studio',
  },
];
