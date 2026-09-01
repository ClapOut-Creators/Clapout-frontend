import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'sign-in' },
  {
    path: 'sign-in',
    loadComponent: () => import('./sign-in').then((module) => module.SignIn),
    title: 'Sign in - ClapOut Studio',
  },
  {
    path: 'sign-up',
    loadComponent: () => import('./sign-up').then((module) => module.SignUp),
    title: 'Create your account - ClapOut Studio',
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./forgot-password').then((module) => module.ForgotPassword),
    title: 'Reset your password - ClapOut Studio',
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./reset-password').then((module) => module.ResetPassword),
    title: 'Choose a new password - ClapOut Studio',
  },
];
