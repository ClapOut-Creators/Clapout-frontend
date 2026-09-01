import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth-service';
import { CampaignsRepository } from '../../core/data/campaigns-repository';
import { RegistrationsRepository } from '../../core/data/registrations-repository';
import { PublicCampaign } from '../../core/models/campaign';
import { Registration } from '../../core/models/registration';
import {
  budgetPercent,
  campaignStatusLabel,
  campaignStatusTone,
  formatDate,
  formatDateTime,
  formatMoney,
  hasBudget,
  openCountdownLabel,
  platformLabel,
  registrationStatusLabel,
} from '../../core/util/campaign-format';
import { createNowSignal } from '../../shared/time/clock';

type DetailState = 'loading' | 'ready' | 'not-found' | 'error';

/** Public campaign detail. Mirrors the landing detail layout and owns the register CTA. */
@Component({
  imports: [ButtonModule, MessageModule, ProgressBarModule, RouterLink, SkeletonModule, TagModule],
  selector: 'app-campaign-detail',
  templateUrl: './campaign-detail.html',
})
export class CampaignDetail {
  /** Bound from the `:slug` route parameter via `withComponentInputBinding()`. */
  readonly slug = input.required<string>();

  private readonly campaigns = inject(CampaignsRepository);
  private readonly registrations = inject(RegistrationsRepository);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly state = signal<DetailState>('loading');
  protected readonly campaign = signal<PublicCampaign | null>(null);
  protected readonly existingRegistration = signal<Registration | null>(null);
  protected readonly errorMessage = signal<string>('');
  protected readonly descriptionExpanded = signal(false);

  protected readonly isSignedIn = this.auth.isSignedIn;

  protected readonly isUpcoming = computed(() => this.campaign()?.status === 'UPCOMING');
  private readonly now = createNowSignal({ enabled: this.isUpcoming });

  /** 'HH:MM:SS' until registration opens, or null once it has (or if unknown). */
  protected readonly openCountdown = computed(() =>
    this.isUpcoming() ? openCountdownLabel(this.campaign()?.startDate, this.now()) : null,
  );

  protected readonly budgetPercent = budgetPercent;
  protected readonly campaignStatusLabel = campaignStatusLabel;
  protected readonly campaignStatusTone = campaignStatusTone;
  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;
  protected readonly formatMoney = formatMoney;
  protected readonly hasBudget = hasBudget;
  protected readonly platformLabel = platformLabel;
  protected readonly registrationStatusLabel = registrationStatusLabel;

  constructor() {
    effect(() => {
      void this.load(this.slug());
    });
  }

  protected reload(): void {
    void this.load(this.slug());
  }

  /** Disabled CTA copy while the campaign is announced but not open yet. */
  protected upcomingCtaLabel(): string {
    const countdown = this.openCountdown();
    return countdown ? `Registration opens in ${countdown}` : 'Registration opens soon';
  }

  protected toggleDescription(): void {
    this.descriptionExpanded.update((expanded) => !expanded);
  }

  /** Where the register CTA sends the visitor once they have an account. */
  protected applyUrl(): string {
    return `/creator/campaigns/${this.slug()}/apply`;
  }

  protected register(): void {
    const target = this.applyUrl();
    if (this.auth.isSignedIn()) {
      void this.router.navigateByUrl(target);
      return;
    }
    void this.router.navigate(['/auth/sign-up'], { queryParams: { returnUrl: target } });
  }

  protected platformSummary(campaign: PublicCampaign): string {
    return campaign.platforms.map(platformLabel).join(', ') || 'Not specified';
  }

  private async load(slug: string): Promise<void> {
    this.state.set('loading');
    this.existingRegistration.set(null);

    try {
      const campaign = await this.campaigns.bySlug(slug);
      this.campaign.set(campaign);
      await this.loadOwnRegistration(slug);
      this.state.set('ready');
    } catch (error) {
      this.campaign.set(null);
      if (error instanceof ApiError && error.isNotFound) {
        this.state.set('not-found');
        return;
      }
      this.errorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load this campaign.',
      );
      this.state.set('error');
    }
  }

  /** Best effort: an unreadable registration list must not break a public page. */
  private async loadOwnRegistration(slug: string): Promise<void> {
    await this.auth.whenSessionReady();
    if (!this.auth.isSignedIn()) {
      return;
    }
    try {
      const mine = await this.registrations.listMine();
      this.existingRegistration.set(mine.find((item) => item.campaign.slug === slug) ?? null);
    } catch {
      this.existingRegistration.set(null);
    }
  }
}
