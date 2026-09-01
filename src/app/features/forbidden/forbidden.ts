import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Shown when a signed-in user reaches a route their role does not cover. */
@Component({
  imports: [RouterLink],
  selector: 'app-forbidden',
  template: `
    <main class="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 class="text-2xl font-semibold text-surface-900">You don't have access to this page</h1>
      <p class="mt-3 text-surface-600">
        This area is for ClapOut admins. If you think you should have access, ask an admin to check
        your account role.
      </p>
      <a
        routerLink="/campaigns"
        class="mt-6 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast no-underline"
        >Browse campaigns</a
      >
    </main>
  `,
})
export class Forbidden {}
