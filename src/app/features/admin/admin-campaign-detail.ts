import { Component, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ChevronDown } from '@primeicons/angular/chevron-down';
import { Download } from '@primeicons/angular/download';
import { ExternalLink } from '@primeicons/angular/external-link';
import { Facebook } from '@primeicons/angular/facebook';
import { Instagram } from '@primeicons/angular/instagram';
import { Tiktok } from '@primeicons/angular/tiktok';
import { Twitter } from '@primeicons/angular/twitter';
import { Whatsapp } from '@primeicons/angular/whatsapp';
import { Youtube } from '@primeicons/angular/youtube';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { ApiError } from '../../core/api/api-error';
import { AdminRepository } from '../../core/data/admin-repository';
import { PublicCampaign } from '../../core/models/campaign';
import {
  budgetPercent,
  campaignStatusLabel,
  formatDate,
  formatMoneyExact,
  hasBudget,
  NOT_ANNOUNCED,
  platformLabel,
} from '../../core/util/campaign-format';
import { BrandLogoTile } from '../../shared/admin/brand-logo-tile';
import { campaignStatusPillClass } from '../../shared/admin/campaign-compact-card';
import { ClippersTable } from '../../shared/admin/clippers-table';
import { PageHeader } from '../../shared/admin/page-header';
import { SubmissionsTable } from '../../shared/admin/submissions-table';
import { SnapchatIcon } from '../../shared/icons/snapchat-icon';
import { ShareCampaignButton } from '../../shared/public/share-campaign-button';

type DetailState = 'loading' | 'ready' | 'not-found' | 'error';

/**
 * Admin view of one campaign: the public-facing detail plus the performance
 * overview, lifecycle actions (edit / publish / pause / reopen) and the
 * campaign's Registered Clippers table.
 */
@Component({
  imports: [
    BrandLogoTile,
    ButtonModule,
    ChevronDown,
    ClippersTable,
    Download,
    ExternalLink,
    Facebook,
    Instagram,
    MessageModule,
    PageHeader,
    RouterLink,
    ShareCampaignButton,
    SkeletonModule,
    SnapchatIcon,
    SubmissionsTable,
    Tiktok,
    Twitter,
    Whatsapp,
    Youtube,
  ],
  selector: 'app-admin-campaign-detail',
  templateUrl: './admin-campaign-detail.html',
})
export class AdminCampaignDetail {
  /** Bound from the `:slug` route parameter via `withComponentInputBinding()`. */
  readonly slug = input.required<string>();

  private readonly admin = inject(AdminRepository);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  private readonly confirmations = inject(ConfirmationService);

  /** The embedded tables own their rows, so Export delegates straight to them. */
  private readonly clippers = viewChild(ClippersTable);
  private readonly submissions = viewChild(SubmissionsTable);

  protected readonly state = signal<DetailState>('loading');
  protected readonly campaign = signal<PublicCampaign | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly actionMessage = signal('');
  protected readonly working = signal(false);
  protected readonly descriptionExpanded = signal(false);
  /**
   * ACCEPTED registrations for this campaign — the design's "Active Creators".
   * `null` whenever the admin registrations endpoint is unreachable, which the
   * template renders as an em dash rather than a misleading zero.
   */
  protected readonly acceptedCount = signal<number | null>(null);

  protected readonly budgetPercent = budgetPercent;
  protected readonly campaignStatusLabel = campaignStatusLabel;
  protected readonly campaignStatusPillClass = campaignStatusPillClass;
  protected readonly formatDate = formatDate;
  /** Two decimals with a thin space, per the design. */
  protected readonly formatMoney = formatMoneyExact;
  protected readonly hasBudget = hasBudget;
  protected readonly platformLabel = platformLabel;
  protected readonly notAnnounced = NOT_ANNOUNCED;

  protected readonly activeCreatorsLabel = computed(() => {
    const count = this.acceptedCount();
    return count === null ? NOT_ANNOUNCED : count.toLocaleString('en-GB');
  });

  /** Pausing is our Close action; a closed campaign offers Reopen instead. */
  protected readonly canPause = computed(() => {
    const status = this.campaign()?.status;
    return status === 'ACTIVE' || status === 'UPCOMING';
  });

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

  protected dateRangeLabel(campaign: PublicCampaign): string {
    return `${formatDate(campaign.startDate)} - ${formatDate(campaign.endDate)}`;
  }

  protected editCampaign(slug: string): void {
    void this.router.navigate(['/admin/campaigns', slug, 'edit']);
  }

  protected exportClippers(): void {
    this.clippers()?.exportCsv();
  }

  protected canExportClippers(): boolean {
    return this.clippers()?.canExport() ?? false;
  }

  protected exportSubmissions(): void {
    this.submissions()?.exportCsv();
  }

  protected canExportSubmissions(): boolean {
    return this.submissions()?.canExport() ?? false;
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

  /** Pausing ends registration on a live campaign, so it asks first. */
  protected confirmClose(): void {
    this.confirmations.confirm({
      header: 'Pause this campaign?',
      message:
        'Creators will no longer be able to register. Existing registrations are kept and stay reviewable.',
      acceptLabel: 'Pause campaign',
      rejectLabel: 'Keep it open',
      accept: () => void this.close(),
    });
  }

  /** Undo an (accidental) pause — the API restores Active/Upcoming by dates. */
  protected async reopen(): Promise<void> {
    if (this.working()) {
      return;
    }
    this.working.set(true);
    this.actionMessage.set('');
    try {
      const updated = await this.admin.reopenCampaign(this.slug());
      this.campaign.set(updated);
      this.messages.add({
        severity: 'success',
        summary: 'Campaign reopened',
        detail: `${updated.title} is ${campaignStatusLabel(updated.status).toLowerCase()} again.`,
      });
    } catch (error) {
      this.actionMessage.set(
        error instanceof ApiError ? error.message : 'We could not reopen this campaign.',
      );
    } finally {
      this.working.set(false);
    }
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
        summary: 'Campaign paused',
        detail: `${updated.title} is no longer accepting registrations.`,
      });
    } catch (error) {
      this.actionMessage.set(
        error instanceof ApiError ? error.message : 'We could not pause this campaign.',
      );
    } finally {
      this.working.set(false);
    }
  }

  private async load(slug: string): Promise<void> {
    this.state.set('loading');
    this.actionMessage.set('');
    this.acceptedCount.set(null);
    try {
      const campaign = await this.admin.campaignBySlug(slug);
      if (!campaign) {
        this.state.set('not-found');
        this.campaign.set(null);
        return;
      }
      this.campaign.set(campaign);
      this.state.set('ready');
      void this.loadAcceptedCount(slug);
    } catch (error) {
      this.campaign.set(null);
      this.errorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load this campaign.',
      );
      this.state.set('error');
    }
  }

  /**
   * "Active Creators" is a headline number, not the page: a failure here leaves
   * an em dash in one tile instead of taking the whole detail into an error
   * state.
   */
  private async loadAcceptedCount(slug: string): Promise<void> {
    try {
      const accepted = await this.admin.registrations({ campaignSlug: slug, status: 'ACCEPTED' });
      this.acceptedCount.set(accepted.length);
    } catch {
      this.acceptedCount.set(null);
    }
  }
}
