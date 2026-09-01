import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ApiError } from '../../core/api/api-error';
import { CampaignsRepository } from '../../core/data/campaigns-repository';
import { PublicCampaign } from '../../core/models/campaign';
import {
  budgetPercent,
  campaignStatusLabel,
  campaignStatusTone,
  daysLeftLabel,
  formatDate,
  formatMoney,
  hasBudget,
  openCountdownLabel,
  platformLabel,
} from '../../core/util/campaign-format';
import { createNowSignal } from '../../shared/time/clock';

type ListState = 'loading' | 'ready' | 'error';

/** Public campaign discovery. Mirrors the landing page's card information architecture. */
@Component({
  imports: [ButtonModule, MessageModule, ProgressBarModule, RouterLink, SkeletonModule, TagModule],
  selector: 'app-campaign-list',
  templateUrl: './campaign-list.html',
})
export class CampaignList {
  private readonly repository = inject(CampaignsRepository);

  protected readonly state = signal<ListState>('loading');
  protected readonly campaigns = signal<PublicCampaign[]>([]);
  protected readonly errorMessage = signal<string>('');
  protected readonly skeletonRows = [0, 1, 2, 3, 4, 5];

  /** Only tick while an announced-but-unopened campaign is on screen. */
  private readonly hasLiveCountdown = computed(() =>
    this.campaigns().some((campaign) => campaign.status === 'UPCOMING'),
  );
  private readonly now = createNowSignal({ enabled: this.hasLiveCountdown });

  protected readonly budgetPercent = budgetPercent;
  protected readonly campaignStatusLabel = campaignStatusLabel;
  protected readonly campaignStatusTone = campaignStatusTone;
  protected readonly formatMoney = formatMoney;
  protected readonly hasBudget = hasBudget;
  protected readonly platformLabel = platformLabel;

  constructor() {
    void this.load();
  }

  /**
   * Upcoming campaigns count down to `startDate`; everything else shows the
   * remaining days. Reading `now()` keeps the label live between ticks.
   */
  protected timeLabel(campaign: PublicCampaign): string {
    const now = this.now();
    if (campaign.status === 'UPCOMING') {
      const countdown = openCountdownLabel(campaign.startDate, now);
      return countdown ? `Opens in ${countdown}` : `Opens ${formatDate(campaign.startDate)}`;
    }
    return daysLeftLabel(campaign.endDate, now);
  }

  protected async load(): Promise<void> {
    this.state.set('loading');
    try {
      this.campaigns.set(await this.repository.list());
      this.state.set('ready');
    } catch (error) {
      this.campaigns.set([]);
      this.errorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load campaigns right now.',
      );
      this.state.set('error');
    }
  }

  protected platformSummary(campaign: PublicCampaign): string {
    return campaign.platforms.map(platformLabel).join(', ') || 'Not specified';
  }
}
