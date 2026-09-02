import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ChevronRight } from '@primeicons/angular/chevron-right';
import { Video } from '@primeicons/angular/video';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { ApiError } from '../../core/api/api-error';
import { RegistrationsRepository } from '../../core/data/registrations-repository';
import { SubmissionsRepository } from '../../core/data/submissions-repository';
import { Registration, registrationCampaign } from '../../core/models/registration';
import { CreatorStats, Submission } from '../../core/models/submission';
import {
  formatMoneyExact,
  HOME_CURRENCY,
  NOT_ANNOUNCED,
  totalsLabel,
} from '../../core/util/campaign-format';
import { BrandLogoTile } from '../../shared/admin/brand-logo-tile';
import { StatCard } from '../../shared/admin/stat-card';
import { SubmissionList } from '../../shared/creator/submission-list';

type PageState = 'loading' | 'ready' | 'error';

/** The campaign picker's rows: one ACCEPTED registration each. */
interface AcceptedCampaign {
  slug: string;
  title: string;
  brandName: string;
  logoUrl: string | null;
  logoBg: string;
}

/**
 * "Your submissions" (`/creator/submissions`) — every clip the clipper has sent,
 * their headline totals from `GET /me/stats`, and the campaign picker behind
 * "Submit a clip".
 *
 * Drawn in the clipper dashboard's language (white `rounded-[18.8px]` panels,
 * `#2B2B2B` headings, `#808080` body, 50px pills).
 */
@Component({
  imports: [
    BrandLogoTile,
    ButtonModule,
    ChevronRight,
    DialogModule,
    MessageModule,
    RouterLink,
    SkeletonModule,
    StatCard,
    SubmissionList,
    Video,
  ],
  selector: 'app-creator-submissions',
  templateUrl: './creator-submissions.html',
})
export class CreatorSubmissions {
  private readonly submissionsRepository = inject(SubmissionsRepository);
  private readonly registrations = inject(RegistrationsRepository);
  private readonly confirmations = inject(ConfirmationService);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  protected readonly state = signal<PageState>('loading');
  protected readonly submissions = signal<Submission[]>([]);
  protected readonly stats = signal<CreatorStats | null>(null);
  protected readonly accepted = signal<AcceptedCampaign[]>([]);
  protected readonly errorMessage = signal('');
  protected readonly statsError = signal('');
  protected readonly pickerOpen = signal(false);
  protected readonly withdrawingIds = signal<ReadonlySet<string>>(new Set<string>());
  protected readonly skeletonRows = [0, 1, 2];

  protected readonly notAnnounced = NOT_ANNOUNCED;

  /** Unknown until `GET /me/stats` answers, rather than a placeholder zero. */
  protected readonly submissionsValue = computed(() => {
    const stats = this.stats();
    return stats ? String(stats.submissions) : NOT_ANNOUNCED;
  });

  protected readonly pendingValue = computed(() => {
    const stats = this.stats();
    return stats ? String(stats.pendingSubmissions) : NOT_ANNOUNCED;
  });

  protected readonly viewsValue = computed(() => {
    const stats = this.stats();
    return stats ? stats.verifiedViews.toLocaleString('en-GB') : NOT_ANNOUNCED;
  });

  /** Unknown until `GET /me/stats` answers, rather than a placeholder zero. */
  protected readonly earnedValue = computed(() => {
    const stats = this.stats();
    return stats ? totalsLabel(stats.earned) : formatMoneyExact(HOME_CURRENCY, null);
  });

  protected readonly canSubmit = computed(() => this.accepted().length > 0);

  constructor() {
    void this.load();
  }

  /**
   * One accepted campaign needs no picker — go straight to its submit page.
   * Anything else opens the dialog.
   */
  protected startSubmission(): void {
    const accepted = this.accepted();
    if (accepted.length === 1) {
      void this.router.navigate(['/creator/campaigns', accepted[0].slug, 'submit']);
      return;
    }
    this.pickerOpen.set(true);
  }

  protected chooseCampaign(slug: string): void {
    this.pickerOpen.set(false);
    void this.router.navigate(['/creator/campaigns', slug, 'submit']);
  }

  protected confirmWithdraw(submission: Submission): void {
    this.confirmations.confirm({
      header: 'Withdraw this clip?',
      message:
        'It will be removed from the review queue. You can submit the same clip again afterwards.',
      acceptLabel: 'Withdraw clip',
      rejectLabel: 'Keep it',
      accept: () => void this.withdraw(submission),
    });
  }

  protected async load(): Promise<void> {
    this.state.set('loading');
    try {
      this.submissions.set(await this.submissionsRepository.listMine());
      this.state.set('ready');
    } catch (error) {
      this.submissions.set([]);
      this.errorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load your submissions.',
      );
      this.state.set('error');
    }
    void this.loadStats();
    void this.loadAccepted();
  }

  private async withdraw(submission: Submission): Promise<void> {
    this.withdrawingIds.update((ids) => new Set(ids).add(submission.id));
    try {
      await this.submissionsRepository.remove(submission.id);
      this.submissions.update((rows) => rows.filter((row) => row.id !== submission.id));
      this.messages.add({ severity: 'success', summary: 'Clip withdrawn' });
      void this.loadStats();
    } catch (error) {
      this.messages.add({
        severity: 'error',
        summary: 'Could not withdraw that clip',
        detail:
          error instanceof ApiError && error.code === 'SUBMISSION_LOCKED'
            ? 'A reviewer has already picked it up, so it can no longer be withdrawn.'
            : error instanceof ApiError
              ? error.message
              : 'Please try again in a moment.',
      });
    } finally {
      this.withdrawingIds.update((ids) => {
        const next = new Set(ids);
        next.delete(submission.id);
        return next;
      });
    }
  }

  /** Stats decorate the page; a failure leaves em dashes, not an error screen. */
  private async loadStats(): Promise<void> {
    this.statsError.set('');
    try {
      this.stats.set(await this.submissionsRepository.stats());
    } catch (error) {
      this.stats.set(null);
      this.statsError.set(
        error instanceof ApiError ? error.message : 'We could not load your totals.',
      );
    }
  }

  /** Feeds the campaign picker; without it the button simply stays disabled. */
  private async loadAccepted(): Promise<void> {
    try {
      const mine = await this.registrations.listMine();
      this.accepted.set(
        mine
          .filter((registration) => registration.status === 'ACCEPTED')
          .map((registration) => toAcceptedCampaign(registration)),
      );
    } catch {
      this.accepted.set([]);
    }
  }
}

function toAcceptedCampaign(registration: Registration): AcceptedCampaign {
  const campaign = registrationCampaign(registration.campaign);
  return {
    slug: campaign.slug,
    title: campaign.title || campaign.brand.name,
    brandName: campaign.brand.name,
    logoUrl: campaign.brand.logoUrl,
    logoBg: campaign.brand.logoBg,
  };
}
