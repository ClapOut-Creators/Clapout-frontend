import { Component, inject, signal } from '@angular/core';
import { MessageModule } from 'primeng/message';
import { ApiError } from '../../core/api/api-error';
import { AdminRepository } from '../../core/data/admin-repository';
import { ClippersTable } from '../../shared/components/clippers-table';
import { PageHeader } from '../../shared/components/page-header';

interface CampaignOption {
  label: string;
  value: string;
}

/**
 * `/admin/registrations` — every creator application, across every campaign.
 *
 * Deliberately thin: `ClippersTable` owns the rows, the filters, status editing,
 * CSV export and its own loading/error/empty states. This page only fetches the
 * campaign list that feeds the table's campaign dropdown.
 */
@Component({
  imports: [ClippersTable, MessageModule, PageHeader],
  selector: 'app-admin-registrations',
  templateUrl: './admin-registrations.html',
})
export class AdminRegistrations {
  private readonly admin = inject(AdminRepository);

  protected readonly campaignOptions = signal<CampaignOption[]>([]);
  /** Set only when the campaign lookup fails; the table itself still works. */
  protected readonly optionsError = signal<string>('');

  constructor() {
    void this.loadCampaignOptions();
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
