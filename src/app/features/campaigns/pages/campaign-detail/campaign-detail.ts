import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ChevronDown } from '@primeicons/angular/chevron-down';
import { ChevronLeft } from '@primeicons/angular/chevron-left';
import { ExternalLink } from '@primeicons/angular/external-link';
import { Facebook } from '@primeicons/angular/facebook';
import { Instagram } from '@primeicons/angular/instagram';
import { Link } from '@primeicons/angular/link';
import { Tiktok } from '@primeicons/angular/tiktok';
import { Twitter } from '@primeicons/angular/twitter';
import { Youtube } from '@primeicons/angular/youtube';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ApiError } from '../../../../core/api/api-error';
import { AuthService } from '../../../../core/auth/auth-service';
import { CampaignsRepository } from '../../data-access/campaigns-repository';
import { RegistrationsRepository } from '../../../registrations/data-access/registrations-repository';
import { PublicCampaign } from '../../models/campaign';
import { Registration } from '../../../registrations/models/registration';
import {
  budgetPercent,
  campaignStatusLabel,
  campaignStatusTone,
  formatDate,
  formatDateTime,
  formatMoneyExact,
  hasBudget,
  NOT_ANNOUNCED,
  openCountdownLabel,
  platformLabel,
  registrationStatusLabel,
} from '../../../../shared/utils/campaign-format';
import { BrandLogoTile } from '../../../../shared/components/brand-logo-tile';
import { ShareCampaignButton } from '../../components/share-campaign-button';
import { LinkifiedText } from '../../utils/linkified-text';
import { createNowSignal } from '../../../../shared/components/clock';

type DetailState = 'loading' | 'ready' | 'not-found' | 'error';

/**
 * Public campaign detail (Figma 344:2763 desktop / 344:2929 mobile).
 *
 * Desktop is a 1249px content column split into two rows: identity + banner
 * above the rule, brief/requirements/resources beside the money panel below it.
 * Mobile keeps a single column and hoists the money panel and register CTA
 * above the long-form sections, exactly as the 380px board does.
 *
 * The page renders inside the public chrome, so it draws no navbar or footer.
 */
@Component({
  imports: [
    BrandLogoTile,
    ButtonModule,
    ChevronDown,
    ChevronLeft,
    ExternalLink,
    Facebook,
    Instagram,
    Link,
    LinkifiedText,
    MessageModule,
    RouterLink,
    ShareCampaignButton,
    SkeletonModule,
    TagModule,
    Tiktok,
    Twitter,
    Youtube,
  ],
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

  /** Figma's register button: 556x40, r=12, #EC612C. */
  protected readonly ctaClass =
    '!h-10 !w-full !justify-center !rounded-xl !border-[#EC612C] !bg-[#EC612C] !text-[18px] !font-medium !text-white';

  protected readonly budgetPercent = budgetPercent;
  protected readonly campaignStatusLabel = campaignStatusLabel;
  protected readonly campaignStatusTone = campaignStatusTone;
  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;
  protected readonly formatMoneyExact = formatMoneyExact;
  protected readonly hasBudget = hasBudget;
  protected readonly notAnnounced = NOT_ANNOUNCED;
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

  /**
   * The collapsed brief is three lines on the desktop board and four on the
   * 380px one; expanding drops the clamp entirely.
   */
  protected descriptionClampClass(): string {
    return this.descriptionExpanded() ? '' : 'line-clamp-4 lg:line-clamp-3';
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

  /**
   * The facts panel prints the schedule as one range, null-safe on both ends.
   * A range inside one year prints that year once ("12 July - 28 August 2026"),
   * as the board does; anything unparsable or unannounced falls back to the
   * plain `formatDate` output, so a missing end date still reads "14 July 2026 - —".
   */
  protected dateRangeLabel(campaign: PublicCampaign): string {
    const end = formatDate(campaign.endDate);
    const start = new Date(campaign.startDate);
    const endDate = campaign.endDate ? new Date(campaign.endDate) : null;
    const sameYear =
      endDate !== null &&
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(endDate.getTime()) &&
      start.getFullYear() === endDate.getFullYear();

    if (sameYear) {
      return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} - ${end}`;
    }
    return `${formatDate(campaign.startDate)} - ${end}`;
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
