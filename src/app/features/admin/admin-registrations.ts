import { Component, computed, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageModule } from 'primeng/message';
import { ApiError } from '../../core/api/api-error';
import { AdminRepository } from '../../core/data/admin-repository';
import { ClippersTable } from '../../shared/admin/clippers-table';
import { CreatorsTable } from '../../shared/admin/creators-table';
import { PageHeader } from '../../shared/admin/page-header';

interface CampaignOption {
  label: string;
  value: string;
}

/** `?view=` values. Anything else falls back to the default. */
export type RegistrationsView = 'clippers' | 'registrations';

export const REGISTRATION_VIEWS: { label: string; value: RegistrationsView; hint: string }[] = [
  {
    label: 'All clippers',
    value: 'clippers',
    hint: 'Everyone with an account, including clippers who have not applied to a campaign yet.',
  },
  {
    label: 'Campaign registrations',
    value: 'registrations',
    hint: 'Every application to a campaign, with its review status.',
  },
];

export function parseView(raw: string | null | undefined): RegistrationsView {
  return raw === 'registrations' ? 'registrations' : 'clippers';
}

/** Figma's tab chips: orange when selected, neutral grey otherwise. */
const TAB_SELECTED = 'bg-[#EC612C] text-white';
const TAB_IDLE = 'bg-[#ECECEC] text-[#525252] hover:bg-[#E2E2E2]';

/**
 * `/admin/registrations` — two views of the platform's clippers, switched by
 * `?view=` so each is linkable:
 *
 * - "All clippers" (default): one row per creator account, from
 *   `GET /admin/creators`. This is the only place a clipper who signed up but
 *   never applied to a campaign shows up.
 * - "Campaign registrations": one row per application, from
 *   `GET /admin/registrations`, with the review status editable inline.
 *
 * Both tables own their filters, export and states; this page only supplies
 * the campaign options the registrations table's dropdown needs.
 */
@Component({
  imports: [ClippersTable, CreatorsTable, MessageModule, PageHeader],
  selector: 'app-admin-registrations',
  templateUrl: './admin-registrations.html',
})
export class AdminRegistrations {
  /** Bound from `?view=` via `withComponentInputBinding()`. */
  readonly view = input<string>();

  private readonly admin = inject(AdminRepository);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly views = REGISTRATION_VIEWS;
  protected readonly activeView = computed(() => parseView(this.view()));
  protected readonly subtitle = computed(
    () => REGISTRATION_VIEWS.find((item) => item.value === this.activeView())?.hint ?? '',
  );

  protected readonly campaignOptions = signal<CampaignOption[]>([]);
  /** Set only when the campaign lookup fails; the tables themselves still work. */
  protected readonly optionsError = signal<string>('');

  constructor() {
    void this.loadCampaignOptions();
  }

  protected tabClass(value: RegistrationsView): string {
    return this.activeView() === value ? TAB_SELECTED : TAB_IDLE;
  }

  /** The default view keeps a clean URL; the other one is spelled out. */
  protected setView(value: RegistrationsView): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: value === 'clippers' ? null : value },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Failing here narrows a filter, it does not break the page, so the error is
   * an inline notice rather than a page-level error state.
   */
  private async loadCampaignOptions(): Promise<void> {
    try {
      const campaigns = await this.admin.campaigns();
      this.campaignOptions.set(
        campaigns
          .map((campaign) => ({
            label: campaign.title || campaign.brand.name,
            value: campaign.slug,
          }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      );
      this.optionsError.set('');
    } catch (error) {
      this.campaignOptions.set([]);
      this.optionsError.set(
        error instanceof ApiError ? error.message : 'We could not load the campaign list.',
      );
    }
  }
}
