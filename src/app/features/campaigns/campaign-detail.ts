import { Location, NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChevronDown } from '@primeicons/angular/chevron-down';
import { ChevronLeft } from '@primeicons/angular/chevron-left';
import { ExternalLink } from '@primeicons/angular/external-link';
import { Facebook } from '@primeicons/angular/facebook';
import { Instagram } from '@primeicons/angular/instagram';
import { Link } from '@primeicons/angular/link';
import { Lock } from '@primeicons/angular/lock';
import { Tiktok } from '@primeicons/angular/tiktok';
import { Twitter } from '@primeicons/angular/twitter';
import { Whatsapp } from '@primeicons/angular/whatsapp';
import { Youtube } from '@primeicons/angular/youtube';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth-service';
import { CampaignsRepository } from '../../core/data/campaigns-repository';
import { RegistrationsRepository } from '../../core/data/registrations-repository';
import { PublicCampaign } from '../../core/models/campaign';
import { CampaignLeaderboard } from '../../core/models/leaderboard';
import { Registration } from '../../core/models/registration';
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
} from '../../core/util/campaign-format';
import { BrandLogoTile } from '../../shared/admin/brand-logo-tile';
import { CreatorPageHeader } from '../../shared/creator/creator-page-header';
import { LeaderboardList } from '../../shared/creator/leaderboard-list';
import { SubmitPostDialog } from '../../shared/creator/submit-post-dialog';
import { SnapchatIcon } from '../../shared/icons/snapchat-icon';
import { ShareCampaignButton } from '../../shared/public/share-campaign-button';
import { LinkifiedText } from '../../shared/text/linkified-text';
import { createNowSignal } from '../../shared/time/clock';

type DetailState = 'loading' | 'ready' | 'not-found' | 'error';
type LeaderboardState = 'idle' | 'loading' | 'ready' | 'error';
type DetailTab = 'detail' | 'leaderboard';

/**
 * Campaign detail, in two variants over the same content body.
 *
 * Anonymous visitors and admins get the public page (Figma 344:2763 desktop /
 * 344:2929 mobile): a 1249px content column split into two rows — identity +
 * banner above the rule, brief/requirements/resources beside the money panel
 * below it. Mobile keeps a single column and hoists the money panel and
 * register CTA above the long-form sections, exactly as the 380px board does.
 * It renders inside the public chrome, so it draws no navbar or footer.
 *
 * A signed-in clipper gets the studio variant (Figma 397:3135 / 398:4552, with
 * the leaderboard tab 398:6785 / 398:6940): the creator page header row, then
 * one white card holding Back / Share, the Detail and Leaderboard tab pills,
 * and the same content body. The tab and the submit overlay are URL state
 * (`?tab=leaderboard`, `?submit=1`), so both are shareable and survive a reload.
 */
@Component({
  imports: [
    BrandLogoTile,
    ButtonModule,
    ChevronDown,
    ChevronLeft,
    CreatorPageHeader,
    ExternalLink,
    Facebook,
    Instagram,
    LeaderboardList,
    Link,
    Lock,
    LinkifiedText,
    MessageModule,
    NgTemplateOutlet,
    RouterLink,
    ShareCampaignButton,
    SkeletonModule,
    SnapchatIcon,
    SubmitPostDialog,
    TagModule,
    Tiktok,
    Twitter,
    Whatsapp,
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
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  protected readonly state = signal<DetailState>('loading');
  protected readonly campaign = signal<PublicCampaign | null>(null);
  protected readonly existingRegistration = signal<Registration | null>(null);
  protected readonly errorMessage = signal<string>('');
  protected readonly descriptionExpanded = signal(false);

  protected readonly leaderboardState = signal<LeaderboardState>('idle');
  protected readonly leaderboard = signal<CampaignLeaderboard | null>(null);
  protected readonly leaderboardError = signal<string>('');

  protected readonly isSignedIn = this.auth.isSignedIn;

  /**
   * Admins keep the public layout they see today; anonymous visitors keep the
   * public board pixel for pixel. Only a signed-in clipper gets the studio card.
   */
  protected readonly isStudio = computed(() => this.auth.isSignedIn() && !this.auth.isAdmin());

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  /** `?tab=leaderboard` shows the board; anything else is the detail tab. */
  protected readonly tab = computed<DetailTab>(() =>
    this.queryParams().get('tab') === 'leaderboard' ? 'leaderboard' : 'detail',
  );

  /**
   * `?submit=1` opens the submit-post overlay. The dialog itself is mounted
   * beside this component's card by the integrator; the page only owns the
   * query parameter that drives it.
   */
  readonly submitOpen = computed(() => this.queryParams().get('submit') === '1');

  /**
   * True when this page was reached from another page of the app, so the Back
   * pill can hand the browser its own history instead of guessing a parent.
   * Captured once, at activation: later tab switches replace the URL rather
   * than pushing, precisely so they cannot rewrite this answer.
   */
  private readonly arrivedFromApp: boolean;

  protected readonly isUpcoming = computed(() => this.campaign()?.status === 'UPCOMING');

  /**
   * Only an ACCEPTED clipper on a live campaign can submit; every other
   * registration state keeps the "Already applied" panel.
   */
  protected readonly canSubmitContent = computed(
    () =>
      this.existingRegistration()?.status === 'ACCEPTED' && this.campaign()?.status === 'ACTIVE',
  );
  private readonly now = createNowSignal({ enabled: this.isUpcoming });

  /** 'HH:MM:SS' until registration opens, or null once it has (or if unknown). */
  protected readonly openCountdown = computed(() =>
    this.isUpcoming() ? openCountdownLabel(this.campaign()?.startDate, this.now()) : null,
  );

  /** Placeholder rows while the leaderboard request is in flight. */
  protected readonly skeletonRows = [0, 1, 2, 3, 4];

  /** Figma's register button: 556x40, r=12, #EC612C. */
  protected readonly ctaClass =
    '!h-10 !w-full !justify-center !rounded-xl !border-[#EC612C] !bg-[#EC612C] !text-[18px] !font-medium !text-white';

  /**
   * The content body is shared, but the studio card has its own padding, so the
   * two boards column it slightly differently: the public page leaves 113px
   * between the identity block and the banner, the studio card 63px, and the
   * lower row splits 525/556 rather than 579/557.
   */
  protected readonly heroGapClass = computed(() =>
    this.isStudio() ? 'lg:gap-x-[63px]' : 'lg:gap-x-[113px]',
  );

  protected readonly lowerColumnsClass = computed(() =>
    this.isStudio()
      ? 'lg:grid-cols-[minmax(0,525fr)_minmax(0,556fr)]'
      : 'lg:grid-cols-[minmax(0,579fr)_minmax(0,557fr)]',
  );

  /**
   * On the public page the body hangs below the Back/Share row; inside the
   * studio card the card's own 23px gap already separates it from the tabs.
   */
  protected readonly bodyTopClass = computed(() =>
    this.isStudio() ? '' : 'mt-[15px] lg:mt-[41px]',
  );
  protected readonly bodyTopAltClass = computed(() => (this.isStudio() ? '' : 'mt-8 lg:mt-[41px]'));

  /** Tab pill geometry (Figma "Frame 283"): 36/40 tall, fully rounded. */
  protected tabClass(tab: DetailTab): string {
    const base =
      'inline-flex h-9 cursor-pointer items-center justify-center rounded-full px-5 text-[16px] leading-[23.8px] [font-family:var(--clapout-font-heading)] lg:h-10 lg:px-7';
    return this.tab() === tab
      ? `${base} border border-[#EC612C] bg-[#EC612C] text-white`
      : `${base} border border-[#E5E5E5] bg-[#F2F2F2] text-[#454545] hover:bg-[#ECECEC]`;
  }

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
    const navigation = this.router.getCurrentNavigation() ?? this.router.lastSuccessfulNavigation();
    this.arrivedFromApp = navigation?.previousNavigation != null;

    effect(() => {
      void this.load(this.slug());
    });

    // The board is fetched the first time its tab is shown, not on every visit
    // to a campaign page. `untracked` keeps the guard out of the dependency
    // set, so setting the state below cannot re-trigger this effect.
    effect(() => {
      const tab = this.tab();
      const studio = this.isStudio();
      untracked(() => {
        if (tab === 'leaderboard' && studio && this.leaderboardState() === 'idle') {
          void this.loadLeaderboard();
        }
      });
    });
  }

  /** Breadcrumb trail on the studio header: Dashboard › this campaign. */
  protected crumbs(): string[] {
    const campaign = this.campaign();
    return ['Dashboard', campaign?.title || campaign?.brand.name || 'Campaign'];
  }

  protected selectTab(tab: DetailTab): void {
    if (tab === this.tab()) {
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'leaderboard' ? 'leaderboard' : null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** The studio Back pill: the page we came from, else the clipper's home. */
  protected back(): void {
    if (this.arrivedFromApp) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl('/creator/dashboard');
  }

  /** Opens the submit-post overlay by putting it in the URL. */
  protected openSubmit(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { submit: '1' },
      queryParamsHandling: 'merge',
    });
  }

  /** Closes it again without leaving a dead `?submit=1` in the history. */
  closeSubmit(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { submit: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * A clip just went in: the leaderboard may now include the clipper, so the
   * board is refetched the next time it is shown (immediately if it is showing).
   */
  protected onSubmitted(): void {
    if (this.tab() === 'leaderboard') {
      void this.loadLeaderboard();
      return;
    }
    this.leaderboardState.set('idle');
  }
  protected retryLeaderboard(): void {
    void this.loadLeaderboard();
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

  /** Where an accepted clipper goes to submit a clip for this campaign. */
  protected submitUrl(): string {
    return `/creator/campaigns/${this.slug()}/submit`;
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
    this.leaderboard.set(null);
    this.leaderboardState.set('idle');

    try {
      const campaign = await this.campaigns.bySlug(slug);
      this.campaign.set(campaign);
      await this.loadOwnRegistration(slug);
      this.state.set('ready');
      // A reload of the page is a reload of the board it is already showing —
      // unless the lazy effect above got there first on this very load, which
      // is what the 'idle' guard rules out.
      if (this.tab() === 'leaderboard' && this.isStudio() && this.leaderboardState() === 'idle') {
        void this.loadLeaderboard();
      }
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

  /**
   * The board is its own request, so a 404 (the endpoint is newer than this
   * page) or an outage degrades to a retryable message instead of taking the
   * campaign down with it.
   */
  private async loadLeaderboard(): Promise<void> {
    const slug = this.slug();
    this.leaderboardState.set('loading');
    this.leaderboardError.set('');

    try {
      const board = await this.campaigns.leaderboard(slug);
      if (slug !== this.slug()) {
        return;
      }
      this.leaderboard.set(board);
      this.leaderboardState.set('ready');
    } catch (error) {
      if (slug !== this.slug()) {
        return;
      }
      this.leaderboardError.set(
        error instanceof ApiError && !error.isNotFound
          ? error.message
          : 'We could not load the leaderboard for this campaign.',
      );
      this.leaderboardState.set('error');
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
