import { Component, computed, inject, signal } from '@angular/core';
import { MessageModule } from 'primeng/message';
import { ApiError } from '../../core/api/api-error';
import { AdminRepository } from '../../core/data/admin-repository';
import { AdminSubmission } from '../../core/models/admin';
import { NOT_ANNOUNCED } from '../../core/util/campaign-format';
import { PageHeader } from '../../shared/admin/page-header';
import { StatCard } from '../../shared/admin/stat-card';
import { SubmissionsTable } from '../../shared/admin/submissions-table';

interface CampaignOption {
  label: string;
  value: string;
}

/**
 * `/admin/submissions` — every clip waiting on manual verification.
 *
 * The table owns the rows, filters, review dialog and CSV export. This page adds
 * the header, the campaign options for the filter, and the three headline
 * counts, which are read from an unfiltered `GET /admin/submissions` so the
 * cards keep reporting the whole queue while the table below is filtered.
 */
@Component({
  imports: [MessageModule, PageHeader, StatCard, SubmissionsTable],
  selector: 'app-admin-submissions',
  templateUrl: './admin-submissions.html',
})
export class AdminSubmissions {
  private readonly admin = inject(AdminRepository);

  protected readonly campaignOptions = signal<CampaignOption[]>([]);
  /** Set only when the campaign lookup fails; the table itself still works. */
  protected readonly optionsError = signal<string>('');
  /** null until the count query answers, so the tiles read as unknown. */
  protected readonly all = signal<AdminSubmission[] | null>(null);

  protected readonly pendingValue = computed(() => this.countOf(['SUBMITTED', 'UNDER_REVIEW']));
  protected readonly approvedValue = computed(() => this.countOf(['APPROVED']));
  protected readonly paidValue = computed(() => this.countOf(['PAID']));

  constructor() {
    void this.loadCampaignOptions();
    void this.loadCounts();
  }

  /** The table fired a successful review, so the headline counts have moved. */
  protected onReviewed(): void {
    void this.loadCounts();
  }

  private countOf(statuses: readonly string[]): string {
    const rows = this.all();
    if (rows === null) {
      return NOT_ANNOUNCED;
    }
    return String(rows.filter((row) => statuses.includes(row.status)).length);
  }

  /** Headline counts are decoration; a failure leaves em dashes, not an error page. */
  private async loadCounts(): Promise<void> {
    try {
      this.all.set(await this.admin.submissions());
    } catch {
      this.all.set(null);
    }
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
