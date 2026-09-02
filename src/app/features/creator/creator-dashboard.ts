import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Check } from '@primeicons/angular/check';
import { Clock } from '@primeicons/angular/clock';
import { Home } from '@primeicons/angular/home';
import { Link } from '@primeicons/angular/link';
import { Megaphone } from '@primeicons/angular/megaphone';
import { Search } from '@primeicons/angular/search';
import { Video } from '@primeicons/angular/video';
import { Whatsapp } from '@primeicons/angular/whatsapp';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth-service';
import { RegistrationsRepository } from '../../core/data/registrations-repository';
import { Registration, RegistrationCampaign } from '../../core/models/registration';
import { SocialAccount } from '../../core/models/user';
import {
  daysLeftLabel,
  formatDate,
  formatMoneyExact,
  NOT_ANNOUNCED,
  platformLabel,
  registrationStatusLabel,
  registrationStatusTone,
} from '../../core/util/campaign-format';
import { BrandLogoTile } from '../../shared/admin/brand-logo-tile';
import { StatCard } from '../../shared/admin/stat-card';
import { SocialsDialog } from './socials-dialog';

type DashboardState = 'loading' | 'ready' | 'error';

/** Invite link for the creator community, opened in a new tab. */
const COMMUNITY_URL = 'https://chat.whatsapp.com/L9d71dKBrFy7QonMQJ73da';

/**
 * There is no "joined the community" flag on `Me` and no endpoint to set one, so
 * the checklist remembers the click per browser instead of inventing a contract.
 */
const COMMUNITY_STORAGE_KEY = 'clapout.joinedCommunity';

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

function readJoinedCommunity(): boolean {
  try {
    return localStorage.getItem(COMMUNITY_STORAGE_KEY) === 'true';
  } catch {
    /* Private mode and blocked storage both throw; the step just stays open. */
    return false;
  }
}

/**
 * Creator home (Figma 349:3267): greeting, the "Finish setting up" checklist,
 * four headline stats and the joined-campaigns panel.
 */
@Component({
  imports: [
    BrandLogoTile,
    ButtonModule,
    Check,
    Clock,
    Home,
    Link,
    Megaphone,
    MessageModule,
    RouterLink,
    Search,
    SkeletonModule,
    SocialsDialog,
    StatCard,
    TagModule,
    TooltipModule,
    Video,
    Whatsapp,
  ],
  selector: 'app-creator-dashboard',
  templateUrl: './creator-dashboard.html',
})
export class CreatorDashboard {
  private readonly registrations = inject(RegistrationsRepository);
  private readonly auth = inject(AuthService);

  private readonly user = this.auth.user;
  /**
   * `AuthService.user` is read-only, so a successful `PATCH /me` cannot be
   * written back into it. This holds the list the save returned and takes
   * precedence over the session copy until the next `GET /me` rehydrates it.
   */
  private readonly savedSocials = signal<SocialAccount[] | null>(null);

  protected readonly state = signal<DashboardState>('loading');
  protected readonly applications = signal<Registration[]>([]);
  protected readonly errorMessage = signal('');
  protected readonly joinedCommunity = signal(readJoinedCommunity());
  protected readonly socialsDialogOpen = signal(false);
  protected readonly skeletonCards = [0, 1, 2];

  protected readonly communityUrl = COMMUNITY_URL;
  /** Nothing in the API reports earnings, views or submissions yet. */
  protected readonly earnedValue = formatMoneyExact('GHS', 0);
  protected readonly viewsValue = '0';
  protected readonly submissionsValue = '0';

  protected readonly socials = computed(
    () => this.savedSocials() ?? this.user()?.socials ?? ([] as SocialAccount[]),
  );
  protected readonly socialsDone = computed(() => this.socials().length > 0);
  protected readonly joinedCount = computed(() => this.applications().length);
  protected readonly campaignsDone = computed(
    () => this.state() === 'ready' && this.joinedCount() > 0,
  );

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

  protected readonly daysLeftLabel = daysLeftLabel;
  protected readonly formatDate = formatDate;
  protected readonly formatMoneyExact = formatMoneyExact;
  protected readonly platformLabel = platformLabel;
  protected readonly registrationStatusLabel = registrationStatusLabel;
  protected readonly registrationStatusTone = registrationStatusTone;

  constructor() {
    void this.load();
  }

  /**
   * A registration only carries a campaign summary - no `startDate` - so an
   * UPCOMING campaign cannot be counted down to and says so instead of
   * borrowing the "N days left" copy.
   */
  protected campaignTime(campaign: RegistrationCampaign): string {
    switch (campaign.status) {
      case 'CLOSED':
        return 'Ended';
      case 'DRAFT':
        return 'Not scheduled';
      case 'UPCOMING':
        return 'Not started';
      default:
        return daysLeftLabel(campaign.endDate);
    }
  }

  protected openSocialsDialog(): void {
    this.socialsDialogOpen.set(true);
  }

  protected onSocialsSaved(socials: SocialAccount[]): void {
    this.savedSocials.set(socials);
  }

  protected markCommunityJoined(): void {
    this.joinedCommunity.set(true);
    try {
      localStorage.setItem(COMMUNITY_STORAGE_KEY, 'true');
    } catch {
      /* The link still opened; only the checklist memory is lost. */
    }
  }

  protected async load(): Promise<void> {
    this.state.set('loading');
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
}
