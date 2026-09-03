import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ArrowDown } from '@primeicons/angular/arrow-down';
import { ArrowUp } from '@primeicons/angular/arrow-up';
import { ChevronRight } from '@primeicons/angular/chevron-right';
import { Clock } from '@primeicons/angular/clock';
import { File as FileIcon } from '@primeicons/angular/file';
import { Home } from '@primeicons/angular/home';
import { Megaphone } from '@primeicons/angular/megaphone';
import { Users } from '@primeicons/angular/users';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ApiError } from '../../core/api/api-error';
import { AdminRepository } from '../../core/data/admin-repository';
import { AdminStats } from '../../core/models/admin';
import { PublicCampaign } from '../../core/models/campaign';
import {
  budgetPercent,
  campaignStatusLabel,
  campaignStatusTone,
  formatDateTime,
  formatMoney,
  hasBudget,
} from '../../core/util/campaign-format';
import { BarChart } from '../../shared/charts/bar-chart';

type DashboardState = 'loading' | 'ready' | 'error';

/** One headline number on the stat row. */
interface StatCard {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  /**
   * Mock period-over-period change — AdminStats has no trend data yet, so this
   * is placeholder only. Replace with real figures once the API adds them.
   */
  readonly trend: { readonly direction: 'up' | 'down'; readonly label: string };
}

interface AttentionItem {
  readonly key: string;
  readonly label: string;
  readonly detail: string;
  readonly count: number;
  readonly href: string;
  readonly tone: 'warning' | 'primary' | 'success' | 'neutral';
}

/** How many campaigns the "Recent campaigns" card shows. */
const RECENT_CAMPAIGN_COUNT = 3;
const ENDING_SOON_WINDOW_DAYS = 7;

/** '11 Aug' — compact enough for a 21-column axis. */
function compactDay(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Sortable epoch millis; unparsable timestamps sink to the bottom. */
function timestamp(iso: string | null | undefined): number {
  if (!iso) {
    return 0;
  }
  const parsed = new Date(iso).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatCount(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString('en-GB') : '—';
}

function endsWithinDays(campaign: PublicCampaign, days: number): boolean {
  if (!campaign.endDate || campaign.status !== 'ACTIVE') {
    return false;
  }
  const end = new Date(campaign.endDate).getTime();
  if (Number.isNaN(end)) {
    return false;
  }
  const now = Date.now();
  return end >= now && end <= now + days * 24 * 60 * 60 * 1000;
}

/**
 * Admin home: platform totals, the 21-day registration trend, and the campaigns
 * touched most recently. Both `/admin` calls load together behind one state, so
 * a partial failure retries as a whole rather than showing half a dashboard.
 */
@Component({
  imports: [
    ArrowDown,
    ArrowUp,
    BarChart,
    ButtonModule,
    ChevronRight,
    Clock,
    FileIcon,
    Home,
    Megaphone,
    MessageModule,
    ProgressBarModule,
    RouterLink,
    SkeletonModule,
    TagModule,
    Users,
  ],
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
})
export class AdminDashboard {
  private readonly admin = inject(AdminRepository);
  private readonly router = inject(Router);

  protected readonly state = signal<DashboardState>('loading');
  protected readonly stats = signal<AdminStats | null>(null);
  protected readonly campaigns = signal<PublicCampaign[]>([]);
  protected readonly errorMessage = signal<string>('');
  protected readonly skeletonCards = [0, 1, 2, 3, 4];
  protected readonly skeletonRows = [0, 1, 2];

  protected readonly statCards = computed<StatCard[]>(() => {
    const stats = this.stats();
    if (!stats) {
      return [];
    }
    return [
      {
        key: 'published',
        label: 'Published campaigns',
        value: formatCount(stats.publishedCampaigns),
        trend: { direction: 'up', label: '+7.4%' },
      },
      {
        key: 'registrations',
        label: 'New registrations (7d)',
        value: formatCount(stats.newRegistrations7d),
        trend: { direction: 'up', label: '+2%' },
      },
      {
        key: 'review',
        label: 'Awaiting review',
        value: formatCount(stats.awaitingReview),
        trend: { direction: 'up', label: '+3.5%' },
      },
      {
        key: 'creators',
        label: 'Total creators',
        value: formatCount(stats.totalCreators),
        trend: { direction: 'down', label: '-3%' },
      },
      {
        key: 'brands',
        label: 'Total brands',
        value: formatCount(stats.totalBrands),
        trend: { direction: 'down', label: '-4.3%' },
      },
    ];
  });

  /**
   * Mock "before this window" registration total — AdminStats has no all-time
   * or previous-period count yet. Placeholder pending backend support.
   */
  protected readonly oldRegistrationTotal = formatCount(7260);

  private readonly activity = computed(() => this.stats()?.registrationActivity ?? []);
  protected readonly hasActivity = computed(() => this.activity().length > 0);
  protected readonly activityLabels = computed(() =>
    this.activity().map((point) => compactDay(point.date)),
  );
  protected readonly activityValues = computed(() => this.activity().map((point) => point.count));
  protected readonly activityTotal = computed(() =>
    this.activity().reduce((total, point) => total + point.count, 0),
  );
  protected readonly activitySummary = computed(() => {
    const points = this.activity();
    if (points.length === 0) {
      return 'No registration activity has been recorded for this period.';
    }
    const first = compactDay(points[0].date);
    const last = compactDay(points[points.length - 1].date);
    return `${formatCount(this.activityTotal())} new registrations from ${first} to ${last}.`;
  });

  protected readonly activityAriaLabel = computed(
    () => `Bar chart of new registrations per day over the last ${this.activity().length} days.`,
  );

  /** Newest first, so admins land on whatever they were last editing. */
  protected readonly recentCampaigns = computed(() =>
    [...this.campaigns()]
      .sort((left, right) => timestamp(right.updatedAt) - timestamp(left.updatedAt))
      .slice(0, RECENT_CAMPAIGN_COUNT),
  );

  protected readonly attentionItems = computed<AttentionItem[]>(() => {
    const stats = this.stats();
    const campaigns = this.campaigns();
    const pendingBudget = campaigns.filter((campaign) => !hasBudget(campaign.budgetTotal)).length;
    const endingSoon = campaigns.filter((campaign) =>
      endsWithinDays(campaign, ENDING_SOON_WINDOW_DAYS),
    ).length;

    return [
      {
        key: 'awaiting-review',
        label: 'Creator applications',
        detail: 'Awaiting review',
        count: stats?.awaitingReview ?? 0,
        href: '/admin/registrations',
        tone: 'warning',
      },
      {
        key: 'ending-soon',
        label: 'Campaigns',
        detail: 'Ending soon',
        count: endingSoon,
        href: '/admin/campaigns',
        tone: 'primary',
      },
      {
        key: 'pending-budget',
        label: 'Campaigns',
        detail: 'Pending budget',
        count: pendingBudget,
        href: '/admin/campaigns',
        tone: 'success',
      },
      {
        key: 'reports',
        label: 'Reports',
        detail: 'Require action',
        count: 0,
        href: '/admin/campaigns',
        tone: 'neutral',
      },
    ];
  });

  protected readonly budgetPercent = budgetPercent;
  protected readonly campaignStatusLabel = campaignStatusLabel;
  protected readonly campaignStatusTone = campaignStatusTone;
  protected readonly formatDateTime = formatDateTime;
  protected readonly formatMoney = formatMoney;
  protected readonly hasBudget = hasBudget;

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.state.set('loading');
    this.errorMessage.set('');
    try {
      const [stats, campaigns] = await Promise.all([this.admin.stats(), this.admin.campaigns()]);
      this.stats.set(stats);
      this.campaigns.set(campaigns);
      this.state.set('ready');
    } catch (error) {
      this.stats.set(null);
      this.campaigns.set([]);
      this.errorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load the admin dashboard.',
      );
      this.state.set('error');
    }
  }

  protected createCampaign(): void {
    void this.router.navigate(['/admin/campaigns/new']);
  }
}
