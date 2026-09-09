import { Component, computed, input } from '@angular/core';
import { LEGAL_LAST_UPDATED, LegalKind, legalSections } from './legal-content';

/**
 * Terms of Service and Privacy Policy, the same text clapoutcreators.com
 * publishes (see `legal-content.ts`). Linked from the sign-up consent
 * checkbox, the socials and submit sheets, and the public footer, and laid
 * out like the landing site's legal pages so the two read as one document.
 * Renders inside the public chrome, so it follows the public dark mode.
 */
@Component({
  selector: 'app-legal-page',
  template: `
    <main class="mx-auto w-full max-w-3xl px-5 pt-8 pb-20 sm:px-8 md:px-10">
      <h1
        class="m-0 text-4xl font-semibold text-black/80 [font-family:var(--clapout-font-heading)] md:text-[56px] md:leading-[1.1] dark:text-white"
      >
        {{ title() }}
      </h1>
      <p class="mt-3 mb-0 text-sm tracking-widest text-[#464646] uppercase dark:text-[#A3A3A3]">
        Last updated: {{ lastUpdated }}
      </p>

      <div class="mt-12 flex flex-col gap-10">
        @for (section of sections(); track section.heading) {
          <section>
            <h2
              class="mt-0 mb-3 text-lg font-medium text-black/80 [font-family:var(--clapout-font-heading)] sm:text-xl dark:text-white"
            >
              {{ section.heading }}
            </h2>
            @for (paragraph of section.body; track $index) {
              <p class="mt-0 mb-3 leading-relaxed text-[#464646] dark:text-[#A3A3A3]">
                {{ paragraph }}
              </p>
            }
          </section>
        }
      </div>
    </main>
  `,
})
export class LegalPage {
  /** Supplied by the route's `data`. */
  readonly title = input<string>('Terms of Service');
  /** Which document to show; supplied by the route's `data`, derived from the title otherwise. */
  readonly kind = input<LegalKind>();

  protected readonly lastUpdated = LEGAL_LAST_UPDATED;

  protected readonly sections = computed(() =>
    legalSections(
      this.kind() ?? (this.title().toLowerCase().includes('privacy') ? 'privacy' : 'terms'),
    ),
  );
}
