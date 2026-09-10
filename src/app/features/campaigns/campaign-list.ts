import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Search } from '@primeicons/angular/search';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { PopoverModule } from 'primeng/popover';
import { SkeletonModule } from 'primeng/skeleton';
import { ApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth-service';
import { CampaignsRepository } from '../../core/data/campaigns-repository';
import { CampaignPlatform, CampaignStatus, PublicCampaign } from '../../core/models/campaign';
import { campaignStatusLabel, platformLabel } from '../../core/util/campaign-format';
import {
  CreatorPageHeader,
  Crumb,
  DASHBOARD_CRUMB,
} from '../../shared/creator/creator-page-header';
import { PublicCampaignCard } from '../../shared/public/public-campaign-card';

type ListState = 'loading' | 'ready' | 'error';

interface FilterOption<T> {
  value: T;
  label: string;
}

/** `DRAFT` never leaves the admin section, so it is not offered as a filter. */
const STATUS_FILTERS: readonly CampaignStatus[] = ['ACTIVE', 'UPCOMING', 'CLOSED'];
const PLATFORM_FILTERS: readonly CampaignPlatform[] = [
  'tiktok',
  'instagram',
  'youtube',
  'facebook',
  'x',
  'snapchat',
  'whatsapp',
];

/**
 * Public campaign discovery (Figma 344:1182 desktop / 344:1295 mobile): the
 * centred page title, a search box with a filter popover, and the "Featured
 * campaigns" grid of `app-public-campaign-card`s.
 *
 * The list arrives in one `GET /public/campaigns` call, so searching and
 * filtering are client side — no extra round trip, and the loading, error,
 * empty and filtered-empty states stay distinguishable.
 */
@Component({
  imports: [
    NgTemplateOutlet,
    CreatorPageHeader,
    ButtonModule,
    CheckboxModule,
    FormsModule,
    MessageModule,
    PopoverModule,
    PublicCampaignCard,
    Search,
    SkeletonModule,
  ],
  selector: 'app-campaign-list',
  templateUrl: './campaign-list.html',
})
export class CampaignList {
  private readonly auth = inject(AuthService);
  /** A signed-in clipper sees this list inside the studio shell, with its breadcrumb. */
  protected readonly isStudio = computed(() => this.auth.isSignedIn() && !this.auth.isAdmin());
  protected readonly crumbs: Crumb[] = [DASHBOARD_CRUMB, 'Campaigns'];
  private readonly repository = inject(CampaignsRepository);

  protected readonly state = signal<ListState>('loading');
  protected readonly campaigns = signal<PublicCampaign[]>([]);
  protected readonly errorMessage = signal<string>('');
  protected readonly skeletonRows = [0, 1, 2];

  protected readonly searchTerm = signal('');
  protected readonly selectedStatuses = signal<readonly CampaignStatus[]>([]);
  protected readonly selectedPlatforms = signal<readonly CampaignPlatform[]>([]);
  protected readonly filtersOpen = signal(false);

  protected readonly statusOptions: readonly FilterOption<CampaignStatus>[] = STATUS_FILTERS.map(
    (value) => ({ value, label: campaignStatusLabel(value) }),
  );
  protected readonly platformOptions: readonly FilterOption<CampaignPlatform>[] =
    PLATFORM_FILTERS.map((value) => ({ value, label: platformLabel(value) }));

  protected readonly activeFilterCount = computed(
    () => this.selectedStatuses().length + this.selectedPlatforms().length,
  );

  /** The icon-only filter control carries its own state in its accessible name. */
  protected readonly filterButtonLabel = computed(() => {
    const count = this.activeFilterCount();
    if (count === 0) {
      return 'Filter campaigns';
    }
    return `Filter campaigns, ${count} ${count === 1 ? 'filter' : 'filters'} applied`;
  });

  protected readonly liveCountLabel = computed(() => {
    const total = this.campaigns().length;
    return total === 1 ? '1 campaign is live' : `${total} campaigns are live`;
  });

  /** True whenever anything could be hiding a campaign the visitor loaded. */
  protected readonly isFiltering = computed(
    () => this.activeFilterCount() > 0 || this.searchTerm().trim().length > 0,
  );

  protected readonly visibleCampaigns = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const statuses = this.selectedStatuses();
    const platforms = this.selectedPlatforms();

    return this.campaigns().filter((campaign) => {
      if (statuses.length && !statuses.includes(campaign.status)) {
        return false;
      }
      if (platforms.length && !campaign.platforms.some((entry) => platforms.includes(entry))) {
        return false;
      }
      if (!term) {
        return true;
      }
      return [campaign.title, campaign.brand.name, campaign.category].some((field) =>
        (field ?? '').toLowerCase().includes(term),
      );
    });
  });

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.state.set('loading');
    try {
      this.campaigns.set(await this.repository.list());
      this.state.set('ready');
    } catch (error) {
      this.campaigns.set([]);
      this.errorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load campaigns right now.',
      );
      this.state.set('error');
    }
  }

  protected onSearch(value: string): void {
    this.searchTerm.set(value);
  }

  protected isStatusSelected(status: CampaignStatus): boolean {
    return this.selectedStatuses().includes(status);
  }

  protected toggleStatus(status: CampaignStatus, selected: boolean): void {
    this.selectedStatuses.update((current) =>
      selected ? [...current, status] : current.filter((entry) => entry !== status),
    );
  }

  protected isPlatformSelected(platform: CampaignPlatform): boolean {
    return this.selectedPlatforms().includes(platform);
  }

  protected togglePlatform(platform: CampaignPlatform, selected: boolean): void {
    this.selectedPlatforms.update((current) =>
      selected ? [...current, platform] : current.filter((entry) => entry !== platform),
    );
  }

  protected clearFilters(): void {
    this.selectedStatuses.set([]);
    this.selectedPlatforms.set([]);
    this.searchTerm.set('');
  }
}
