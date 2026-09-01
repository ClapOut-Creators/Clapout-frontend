import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  selector: 'app-not-found',
  template: `
    <main class="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 class="text-2xl font-semibold text-surface-900">Page not found</h1>
      <p class="mt-3 text-surface-600">
        The page you were looking for does not exist or has moved.
      </p>
      <a
        routerLink="/campaigns"
        class="mt-6 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast no-underline"
        >Browse campaigns</a
      >
    </main>
  `,
})
export class NotFound {}
