import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
  formatDate,
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
}

/** How many campaigns the "Recent campaigns" card shows. */
const RECENT_CAMPAIGN_COUNT = 3;

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

/**
 * Admin home: platform totals, the 21-day registration trend, and the campaigns
 * touched most recently. Both `/admin` calls load together behind one state, so
 * a partial failure retries as a whole rather than showing half a dashboard.
 */
@Component({
  imports: [
    BarChart,
    ButtonModule,
    MessageModule,
    ProgressBarModule,
    RouterLink,
    SkeletonModule,
    TagModule,
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
      },
      {
        key: 'registrations',
        label: 'New registrations (7d)',
        value: formatCount(stats.newRegistrations7d),
      },
      { key: 'review', label: 'Awaiting review', value: formatCount(stats.awaitingReview) },
      { key: 'creators', label: 'Total creators', value: formatCount(stats.totalCreators) },
      { key: 'brands', label: 'Total brands', value: formatCount(stats.totalBrands) },
    ];
  });

  private readonly activity = computed(() => this.stats()?.registrationActivity ?? []);
  protected readonly hasActivity = computed(() => this.activity().length > 0);
  protected readonly activityLabels = computed(() =>
    this.activity().map((point) => compactDay(point.date)),
  );
  protected readonly activityValues = computed(() => this.activity().map((point) => point.count));

  protected readonly activityAriaLabel = computed(
    () => `Bar chart of new registrations per day over the last ${this.activity().length} days.`,
  );

  /** Newest first, so admins land on whatever they were last editing. */
  protected readonly recentCampaigns = computed(() =>
    [...this.campaigns()]
      .sort((left, right) => timestamp(right.updatedAt) - timestamp(left.updatedAt))
      .slice(0, RECENT_CAMPAIGN_COUNT),
  );

  protected readonly budgetPercent = budgetPercent;
  protected readonly campaignStatusLabel = campaignStatusLabel;
  protected readonly campaignStatusTone = campaignStatusTone;
  protected readonly formatDate = formatDate;
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
