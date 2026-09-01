import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ApiError } from '../../core/api/api-error';
import { AdminRepository } from '../../core/data/admin-repository';
import { CampaignStatus, PublicCampaign } from '../../core/models/campaign';
import {
  budgetPercent,
  campaignStatusLabel,
  campaignStatusTone,
  daysLeftLabel,
  formatMoney,
  hasBudget,
  platformLabel,
} from '../../core/util/campaign-format';

type ListState = 'loading' | 'ready' | 'error';
/** 'ALL' is the absent-`?status=` default rather than a backend status. */
type StatusTab = CampaignStatus | 'ALL';

const STATUS_TABS: { label: string; value: StatusTab }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Upcoming', value: 'UPCOMING' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Closed', value: 'CLOSED' },
];

/**
 * Admin campaign index. Unlike the public list this includes DRAFT rows, so the
 * status tab set gains a "Draft" entry.
 *
 * The tab lives in `?status=` so a filtered view is shareable and survives a
 * reload; the search box stays local because it is a client-side narrowing of an
 * already-loaded list, not a query the backend answers.
 */
@Component({
  imports: [
    ButtonModule,
    FormsModule,
    InputTextModule,
    MessageModule,
    ProgressBarModule,
    RouterLink,
    SelectButtonModule,
    SkeletonModule,
    TagModule,
  ],
  selector: 'app-admin-campaigns',
  templateUrl: './admin-campaigns.html',
})
export class AdminCampaigns {
  /** Bound from `?status=` via `withComponentInputBinding()`. */
  readonly status = input<string>();

  private readonly admin = inject(AdminRepository);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly state = signal<ListState>('loading');
  protected readonly campaigns = signal<PublicCampaign[]>([]);
  protected readonly errorMessage = signal<string>('');
  protected readonly search = signal('');

  protected readonly statusTabs = STATUS_TABS;
  protected readonly skeletonRows = [0, 1, 2, 3, 4, 5];

  protected readonly budgetPercent = budgetPercent;
  protected readonly campaignStatusLabel = campaignStatusLabel;
  protected readonly campaignStatusTone = campaignStatusTone;
  protected readonly daysLeftLabel = daysLeftLabel;
  protected readonly formatMoney = formatMoney;
  protected readonly hasBudget = hasBudget;

  /** An unknown or missing `?status=` falls back to All rather than 404-ing. */
  protected readonly activeStatus = computed<StatusTab>(() => {
    const raw = (this.status() ?? '').toUpperCase();
    return STATUS_TABS.some((tab) => tab.value === raw) ? (raw as StatusTab) : 'ALL';
  });

  protected readonly hasActiveFilters = computed(
    () => this.activeStatus() !== 'ALL' || this.search().trim().length > 0,
  );

  protected readonly visibleCampaigns = computed(() => {
    const status = this.activeStatus();
    const term = this.search().trim().toLowerCase();
    return this.campaigns().filter((campaign) => {
      if (status !== 'ALL' && campaign.status !== status) {
        return false;
      }
      if (!term) {
        return true;
      }
      return [campaign.title, campaign.brand.name, campaign.category].some((field) =>
        field.toLowerCase().includes(term),
      );
    });
  });

  protected readonly countLabel = computed(() => {
    const total = this.visibleCampaigns().length;
    return `${total} ${total === 1 ? 'campaign' : 'campaigns'}`;
  });

  constructor() {
    void this.load();
  }

  /** Tabs write to the URL; `activeStatus` reads it back through the input. */
  protected setStatus(value: StatusTab): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: value === 'ALL' ? null : value },
      queryParamsHandling: 'merge',
    });
  }

  protected clearFilters(): void {
    this.search.set('');
    this.setStatus('ALL');
  }

  protected platformSummary(campaign: PublicCampaign): string {
    return campaign.platforms.map(platformLabel).join(', ') || 'Not specified';
  }

  protected async load(): Promise<void> {
    this.state.set('loading');
    try {
      this.campaigns.set(await this.admin.campaigns());
      this.state.set('ready');
    } catch (error) {
      this.campaigns.set([]);
      this.errorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load campaigns right now.',
      );
      this.state.set('error');
    }
  }
}
