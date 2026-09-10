import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowRight } from '@primeicons/angular/arrow-right';
import { Check } from '@primeicons/angular/check';
import { Home } from '@primeicons/angular/home';
import { Megaphone } from '@primeicons/angular/megaphone';
import { Whatsapp } from '@primeicons/angular/whatsapp';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth-service';
import { RegistrationsRepository } from '../../core/data/registrations-repository';
import { SubmissionsRepository } from '../../core/data/submissions-repository';
import { PublicCampaign } from '../../core/models/campaign';
import { Registration, registrationCampaign } from '../../core/models/registration';
import { CreatorStats } from '../../core/models/submission';
import { SocialAccount } from '../../core/models/user';
import {
  formatMoneyExact,
  HOME_CURRENCY,
  NOT_ANNOUNCED,
  registrationStatusLabel,
  registrationStatusTone,
  totalsLabel,
} from '../../core/util/campaign-format';
import { StatCard } from '../../shared/admin/stat-card';
import { PublicCampaignCard } from '../../shared/public/public-campaign-card';
import { SocialsDialog } from './socials-dialog';
import { SolarIcon } from '../../shared/icons/solar-icon';
import { CreatorPageHeader } from '../../shared/creator/creator-page-header';
import { COMMUNITY_URL, OnboardingStepper } from '../../shared/creator/onboarding-stepper';
import { OverlaySheet } from '../../shared/creator/overlay-sheet';

type DashboardState = 'loading' | 'ready' | 'error';

function greetingFor(hour: number): string {
  if (hour < 12) {
    return 'Good morning';
  }
  return hour < 18 ? 'Good afternoon' : 'Good evening';
}

/** 'ama@clapout.com' -> 'ama'. Used wherever a display name is missing. */
function emailLocalPart(email: string | undefined): string {
  return email ? email.split('@')[0] : '';
}

/**
 * Creator home (Figma 349:3267): greeting, the "Finish setting up" checklist,
 * four headline stats and the joined-campaigns panel.
 */
@Component({
  imports: [
    ArrowRight,
    ButtonModule,
    Check,
    Home,
    Megaphone,
    MessageModule,
    PublicCampaignCard,
    RouterLink,
    SkeletonModule,
    OnboardingStepper,
    OverlaySheet,
    SocialsDialog,
    CreatorPageHeader,
    SolarIcon,
    StatCard,
    TagModule,
    TooltipModule,
    Whatsapp,
  ],
  selector: 'app-creator-dashboard',
  templateUrl: './creator-dashboard.html',
})
export class CreatorDashboard {
  private readonly registrations = inject(RegistrationsRepository);
  private readonly submissions = inject(SubmissionsRepository);
  private readonly auth = inject(AuthService);

  private readonly user = this.auth.user;

  protected readonly state = signal<DashboardState>('loading');
  protected readonly applications = signal<Registration[]>([]);
  protected readonly errorMessage = signal('');
  /** Stamped by the onboarding steps; `PATCH /me` writes it back into `user`. */
  protected readonly joinedCommunity = computed(() => !!this.user()?.communityJoinedAt);
  protected readonly socialsDialogOpen = signal(false);
  /**
   * Sign-ups from before onboarding existed arrive here with the flag unset.
   * The sheet raises the same steps as the onboarding page, and cannot be
   * dismissed: it closes when the steps are done and not before.
   */
  protected readonly onboardingOpen = signal(this.auth.needsOnboarding());
  protected readonly skeletonCards = [0, 1, 2];

  protected readonly communityUrl = COMMUNITY_URL;
  /** `GET /me/stats`; null until it answers, so the tiles read as unknown. */
  protected readonly stats = signal<CreatorStats | null>(null);

  /** Unknown until `GET /me/stats` answers, rather than a placeholder zero. */
  protected readonly earnedValue = computed(() => {
    const stats = this.stats();
    return stats ? totalsLabel(stats.earned) : formatMoneyExact(HOME_CURRENCY, null);
  });

  protected readonly viewsValue = computed(() => {
    const stats = this.stats();
    return stats ? stats.verifiedViews.toLocaleString('en-GB') : NOT_ANNOUNCED;
  });

  protected readonly submissionsValue = computed(() => {
    const stats = this.stats();
    return stats ? String(stats.submissions) : NOT_ANNOUNCED;
  });

  /** Checklist step 5 is done as soon as one clip has been sent. */
  protected readonly submissionsDone = computed(() => (this.stats()?.submissions ?? 0) > 0);

  /** Campaigns that have accepted this clipper — the only ones that take clips. */
  protected readonly acceptedApplications = computed(() =>
    this.applications().filter((application) => application.status === 'ACCEPTED'),
  );

  protected readonly canSubmit = computed(() => this.acceptedApplications().length > 0);

  /**
   * One accepted campaign goes straight to its campaign page with the submit
   * overlay open (`?submit=1`); several land on the submissions page, which
   * owns the campaign picker.
   */
  protected readonly submitLink = computed(() => {
    const accepted = this.acceptedApplications();
    return accepted.length === 1
      ? `/campaigns/${registrationCampaign(accepted[0].campaign).slug}`
      : '/creator/submissions';
  });

  /** `?submit=1` only when the link actually goes to a campaign page. */
  protected readonly submitLinkQuery = computed(() =>
    this.acceptedApplications().length === 1 ? { submit: 1 } : {},
  );

  protected readonly submissionsSubtitle = computed(() => {
    const count = this.stats()?.submissions ?? 0;
    if (count === 0) {
      return 'Upload the link to the content.';
    }
    return count === 1 ? '1 clip submitted.' : `${count} clips submitted.`;
  });

  protected readonly socials = computed(() => this.user()?.socials ?? ([] as SocialAccount[]));
  protected readonly socialsDone = computed(() => this.socials().length > 0);
  protected readonly joinedCount = computed(() => this.applications().length);
  protected readonly campaignsDone = computed(
    () => this.state() === 'ready' && this.joinedCount() > 0,
  );

  /**
   * The four steps that have a requirement behind them. Once they are all done
   * the checklist folds into a one-line summary — the fifth step (submit a
   * clip) has nothing to gate, so it is not worth a full-height card.
   */
  protected readonly setupDone = computed(
    () => this.socialsDone() && this.joinedCommunity() && this.campaignsDone(),
  );
  /** "Show steps" on the folded summary reopens the full list for this visit. */
  protected readonly checklistExpanded = signal(false);
  protected readonly showChecklist = computed(() => !this.setupDone() || this.checklistExpanded());

  protected readonly setupSummary = computed(() => {
    if (this.submissionsDone()) {
      return 'All five steps done. Keep the clips coming.';
    }
    return this.canSubmit()
      ? 'One thing left: submit your first clip.'
      : 'One thing left: submit your first clip once a campaign accepts you.';
  });

  /** The count is only true once the fetch succeeded; before that it is unknown. */
  protected readonly campaignsValue = computed(() =>
    this.state() === 'ready' ? String(this.joinedCount()) : NOT_ANNOUNCED,
  );

  protected readonly displayName = computed(() => {
    const user = this.user();
    return user?.fullName?.trim() || emailLocalPart(user?.email) || 'Your account';
  });

  protected readonly initials = computed(() => {
    const letters = this.displayName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
    return letters || '?';
  });

  protected readonly greeting = computed(() => {
    const user = this.user();
    const fullName = user?.fullName?.trim() ?? '';
    const firstName = fullName
      ? (fullName.split(/\s+/)[0] ?? fullName)
      : emailLocalPart(user?.email);
    const salutation = greetingFor(new Date().getHours());
    return firstName ? `${salutation}, ${firstName}` : salutation;
  });

  protected readonly campaignsJoinedSubtitle = computed(() =>
    this.joinedCount() === 1
      ? 'You have joined 1 campaign.'
      : `You have joined ${this.joinedCount()} campaigns.`,
  );

  protected readonly socialsSubtitle = computed(() => {
    const count = this.socials().length;
    if (count === 0) {
      return 'Link your TikTok, YouTube and/or Instagram.';
    }
    return count === 1 ? '1 account linked.' : `${count} accounts linked.`;
  });

  protected readonly communitySubtitle = computed(() =>
    this.joinedCommunity() ? 'You are part of the movement.' : 'Become part of the movement.',
  );

  protected readonly campaignsSubtitle = computed(() =>
    this.campaignsDone() ? this.campaignsJoinedSubtitle() : 'Browse and apply to brand campaigns.',
  );

  protected readonly registrationStatusLabel = registrationStatusLabel;
  protected readonly registrationStatusTone = registrationStatusTone;

  constructor() {
    void this.load();
  }

  /**
   * The embedded campaign, normalised to the public contract. Environments
   * still serving the old flat summary render the card's "not announced"
   * states rather than crashing on a missing `brand`.
   */
  protected campaignOf(application: Registration): PublicCampaign {
    return registrationCampaign(application.campaign);
  }

  /** The campaign page for one accepted card, with the submit overlay open. */
  protected submitLinkFor(application: Registration): string {
    return `/campaigns/${registrationCampaign(application.campaign).slug}`;
  }

  /**
   * Takes the "26d ago" slot on the card, which the clipper does not need here.
   * Abbreviated because that slot is one line beside a truncating brand name.
   */
  protected appliedLabel(application: Registration): string {
    const applied = new Date(application.createdAt);
    return Number.isNaN(applied.getTime())
      ? NOT_ANNOUNCED
      : applied.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  protected toggleChecklist(): void {
    this.checklistExpanded.update((open) => !open);
  }

  protected openSocialsDialog(): void {
    this.socialsDialogOpen.set(true);
  }

  /** The link opened in a new tab; record the join, the checklist ticks itself. */
  protected markCommunityJoined(): void {
    if (this.joinedCommunity()) {
      return;
    }
    void this.auth.updateProfile({ communityJoined: true }).catch(() => {
      /* The invite still opened; the tick waits for the next visit. */
    });
  }

  protected finishOnboarding(): void {
    this.onboardingOpen.set(false);
  }

  protected async load(): Promise<void> {
    this.state.set('loading');
    void this.loadStats();
    try {
      this.applications.set(await this.registrations.listMine());
      this.state.set('ready');
    } catch (error) {
      this.applications.set([]);
      this.errorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load your campaigns.',
      );
      this.state.set('error');
    }
  }

  /**
   * Headline numbers are decoration: a failure leaves em dashes in the tiles
   * and an open checklist step, never an error screen over the dashboard.
   */
  private async loadStats(): Promise<void> {
    try {
      this.stats.set(await this.submissions.stats());
    } catch {
      this.stats.set(null);
    }
  }
}
