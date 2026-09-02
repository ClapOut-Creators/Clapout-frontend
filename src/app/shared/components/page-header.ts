import { Component, computed, input } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';

const BREADCRUMB_LINKS: Record<string, string> = {
  Brands: '/admin/brands',
  Campaigns: '/admin/campaigns',
  Dashboard: '/admin/dashboard',
  Partnerships: '/admin/partnerships',
  Registrations: '/admin/registrations',
};

/**
 * Breadcrumb pill + title + subtitle, with the page's primary action projected
 * on the right. Mirrors the admin dashboard header exactly so every admin page
 * reads as one build.
 */
@Component({
  imports: [BreadcrumbModule],
  selector: 'app-page-header',
  template: `
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p-breadcrumb
          homeAriaLabel="Admin dashboard"
          styleClass="!inline-flex !rounded-md !border-0 !bg-[#F1F1F1] !px-3 !py-1.5 !text-sm !font-semibold"
          [home]="homeItem"
          [model]="breadcrumbItems()"
        />
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
  /** Override when the section label is not one of the known admin roots. */
  readonly breadcrumbLink = input<string>();
  /** Optional second crumb, e.g. the brand name on a campaign page. */
  readonly breadcrumbTrail = input<string>();
  /** Override when a trail should be navigable instead of current-page text. */
  readonly breadcrumbTrailLink = input<string>();
  readonly title = input.required<string>();
  readonly subtitle = input<string>();

  protected readonly homeItem: MenuItem = {
    routerLink: '/admin/dashboard',
  };

  protected readonly breadcrumbItems = computed<MenuItem[]>(() => {
    const sectionLink = this.breadcrumbLink() ?? BREADCRUMB_LINKS[this.breadcrumb()];
    const items: MenuItem[] = [
      {
        label: this.breadcrumb(),
        routerLink: sectionLink,
      },
    ];
    const trail = this.breadcrumbTrail();
    if (trail) {
      items.push({
        disabled: !this.breadcrumbTrailLink(),
        label: trail,
        routerLink: this.breadcrumbTrailLink(),
      });
    }
    return items;
  });
}
