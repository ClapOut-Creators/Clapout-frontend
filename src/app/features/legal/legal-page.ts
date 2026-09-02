import { Component, input } from '@angular/core';

/**
 * Placeholder Terms / Privacy pages. The footer and the sign-up consent
 * checkbox link here, so the routes must resolve; the copy is a stub until
 * legal supplies the real text.
 */
@Component({
  selector: 'app-legal-page',
  template: `
    <main class="mx-auto max-w-3xl px-6 py-20">
      <h1 class="text-[32px] font-semibold tracking-tight text-surface-950">{{ title() }}</h1>
      <p class="mt-4 text-[18px] text-surface-600">
        This page is a placeholder. The final {{ title().toLowerCase() }} for ClapOut is being
        prepared and will replace this copy before launch.
      </p>
      <p class="mt-4 text-[18px] text-surface-600">
        In the meantime, reach us at
        <a href="mailto:hello@clapout.co" class="text-primary underline underline-offset-2"
          >hello&#64;clapout.co</a
        >
        with any questions about how ClapOut handles campaigns, creator applications or payouts.
      </p>
    </main>
  `,
})
export class LegalPage {
  /** Supplied by the route's `data`. */
  readonly title = input<string>('Terms of Service');
}
