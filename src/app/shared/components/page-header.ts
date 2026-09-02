import { Component, input } from '@angular/core';
import { Home } from '@primeicons/angular/home';

/**
 * Breadcrumb pill + title + subtitle, with the page's primary action projected
 * on the right. Mirrors the admin dashboard header exactly so every admin page
 * reads as one build.
 */
@Component({
  imports: [Home],
  selector: 'app-page-header',
  template: `
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p
          class="inline-flex items-center gap-1.5 rounded-md bg-[#F1F1F1] px-3 py-1.5 text-sm font-semibold text-surface-800"
        >
          <svg data-p-icon="home" [size]="14" aria-hidden="true"></svg>
          <span>{{ breadcrumb() }}</span>
          @if (breadcrumbTrail(); as trail) {
            <span class="text-surface-500">/ {{ trail }}</span>
          }
        </p>
        <h1 class="mt-2 text-[32px] font-semibold leading-tight tracking-tight text-surface-950">
          {{ title() }}
        </h1>
        @if (subtitle()) {
          <p class="mt-1 text-[20px] text-surface-600">{{ subtitle() }}</p>
        }
      </div>
      <ng-content />
    </header>
  `,
})
export class PageHeader {
  readonly breadcrumb = input.required<string>();
  /** Optional second crumb, e.g. the brand name on a campaign page. */
  readonly breadcrumbTrail = input<string>();
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
