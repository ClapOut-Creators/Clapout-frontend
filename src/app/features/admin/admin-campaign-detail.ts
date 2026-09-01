import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ApiError } from '../../core/api/api-error';
import { AdminRepository } from '../../core/data/admin-repository';
import { PublicCampaign } from '../../core/models/campaign';
import {
  budgetPercent,
  campaignStatusLabel,
  campaignStatusTone,
  formatDate,
  formatMoney,
  hasBudget,
  platformLabel,
} from '../../core/util/campaign-format';
import { ClippersTable } from '../../shared/admin/clippers-table';

type DetailState = 'loading' | 'ready' | 'not-found' | 'error';

/**
 * Admin view of one campaign: the public-facing detail plus the performance
 * overview, lifecycle actions (edit / publish / close) and the campaign's
 * Registered Clippers table.
 */
@Component({
  imports: [
    ButtonModule,
    ClippersTable,
    MessageModule,
    ProgressBarModule,
    RouterLink,
    SkeletonModule,
    TagModule,
  ],
  selector: 'app-admin-campaign-detail',
  templateUrl: './admin-campaign-detail.html',
})
export class AdminCampaignDetail {
  /** Bound from the `:slug` route parameter via `withComponentInputBinding()`. */
  readonly slug = input.required<string>();

  private readonly admin = inject(AdminRepository);
  private readonly messages = inject(MessageService);
  private readonly confirmations = inject(ConfirmationService);

  protected readonly state = signal<DetailState>('loading');
  protected readonly campaign = signal<PublicCampaign | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly actionMessage = signal('');
  protected readonly working = signal(false);
  protected readonly descriptionExpanded = signal(false);

  protected readonly budgetPercent = budgetPercent;
  protected readonly campaignStatusLabel = campaignStatusLabel;
  protected readonly campaignStatusTone = campaignStatusTone;
  protected readonly formatDate = formatDate;
  protected readonly formatMoney = formatMoney;
  protected readonly hasBudget = hasBudget;
  protected readonly platformLabel = platformLabel;

  constructor() {
    effect(() => {
      void this.load(this.slug());
    });
  }

  protected reload(): void {
    void this.load(this.slug());
  }

  protected toggleDescription(): void {
    this.descriptionExpanded.update((expanded) => !expanded);
  }

  protected platformSummary(campaign: PublicCampaign): string {
    return campaign.platforms.map(platformLabel).join(', ') || 'Not specified';
  }

  protected async publish(): Promise<void> {
    if (this.working()) {
      return;
    }
    this.working.set(true);
    this.actionMessage.set('');
    try {
      const updated = await this.admin.publishCampaign(this.slug());
      this.campaign.set(updated);
      this.messages.add({
        severity: 'success',
        summary: 'Campaign published',
        detail: `${updated.title} is now ${campaignStatusLabel(updated.status).toLowerCase()}.`,
      });
    } catch (error) {
      // Publishing validates server side; surface exactly what is still missing
      // and point the admin at the wizard rather than guessing here.
      this.actionMessage.set(
        error instanceof ApiError
          ? error.code === 'INCOMPLETE' || error.status === 422
            ? `${error.message} Use Edit to complete the campaign, then publish again.`
            : error.message
          : 'We could not publish this campaign.',
      );
    } finally {
      this.working.set(false);
    }
  }

  /** Closing ends a live campaign, so it asks first. */
  protected confirmClose(): void {
    this.confirmations.confirm({
      header: 'Close this campaign?',
      message:
        'Creators will no longer be able to register. Existing registrations are kept and stay reviewable.',
      acceptLabel: 'Close campaign',
      rejectLabel: 'Keep it open',
      accept: () => void this.close(),
    });
  }

  private async close(): Promise<void> {
    if (this.working()) {
      return;
    }
    this.working.set(true);
    this.actionMessage.set('');
    try {
      const updated = await this.admin.closeCampaign(this.slug());
      this.campaign.set(updated);
      this.messages.add({
        severity: 'success',
        summary: 'Campaign closed',
        detail: `${updated.title} is no longer accepting registrations.`,
      });
    } catch (error) {
      this.actionMessage.set(
        error instanceof ApiError ? error.message : 'We could not close this campaign.',
      );
    } finally {
      this.working.set(false);
    }
  }

  private async load(slug: string): Promise<void> {
    this.state.set('loading');
    this.actionMessage.set('');
    try {
      const campaign = await this.admin.campaignBySlug(slug);
      if (!campaign) {
        this.state.set('not-found');
        this.campaign.set(null);
        return;
      }
      this.campaign.set(campaign);
      this.state.set('ready');
    } catch (error) {
      this.campaign.set(null);
      this.errorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load this campaign.',
      );
      this.state.set('error');
    }
  }
}
