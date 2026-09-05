import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { ApiError } from '../../core/api/api-error';
import { AdminRepository } from '../../core/data/admin-repository';
import { CampaignPlatform, PublicCampaign } from '../../core/models/campaign';
import { CAMPAIGN_CATEGORY_OPTIONS } from '../../core/util/admin-options';
import { PLATFORM_LABELS } from '../../core/util/campaign-format';
import { CampaignCompactCard } from '../../shared/admin/campaign-compact-card';
import { PageHeader } from '../../shared/admin/page-header';
import {
  activeFilterCount,
  ATTENTION_FILTERS,
  AttentionFilter,
  CampaignFilters,
  filterCampaigns,
  parseAttention,
  parsePlatform,
  parseStatus,
  STATUS_FILTERS,
  StatusFilter,
} from './campaign-filters';

type ListState = 'loading' | 'ready' | 'error';

interface Option<T extends string = string> {
  readonly label: string;
  readonly value: T;
}

/** Figma's tab chips: orange when selected, neutral grey otherwise. */
const TAB_SELECTED = 'bg-[#EC612C] text-white';
const TAB_IDLE = 'bg-[#ECECEC] text-[#525252] hover:bg-[#E2E2E2]';

const PLATFORM_OPTIONS: Option<CampaignPlatform>[] = (
  Object.entries(PLATFORM_LABELS) as [CampaignPlatform, string][]
).map(([value, label]) => ({ label, value }));

/**
 * Admin campaign index. Unlike the public list this includes DRAFT rows, so the
 * status tab set gains a "Draft" entry.
 *
 * Every filter but the search box lives in the query string
 * (`?status=&show=&brand=&category=&platform=`) so a filtered view is shareable,
 * survives a reload, and can be deep-linked from the dashboard's Need Attention
 * card (`?show=ending-soon`). The search stays local because it is a client-side
 * narrowing of an already-loaded list, not a query the backend answers.
 */
@Component({
  imports: [
    ButtonModule,
    CampaignCompactCard,
    FormsModule,
    InputTextModule,
    MessageModule,
    PageHeader,
    RouterLink,
    SelectModule,
    SkeletonModule,
  ],
  selector: 'app-admin-campaigns',
  templateUrl: './admin-campaigns.html',
})
export class AdminCampaigns {
  /** Bound from `?status=` via `withComponentInputBinding()`. */
  readonly status = input<string>();
  /** `?show=ending-soon|pending-budget|registration-open|auto-approve`. */
  readonly show = input<string>();
  /** `?brand=<brandId>`. */
  readonly brand = input<string>();
  /** `?category=Product`. */
  readonly category = input<string>();
  /** `?platform=tiktok`. */
  readonly platform = input<string>();

  private readonly admin = inject(AdminRepository);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly state = signal<ListState>('loading');
  protected readonly campaigns = signal<PublicCampaign[]>([]);
  protected readonly errorMessage = signal<string>('');
  protected readonly search = signal('');

  protected readonly statusTabs = STATUS_FILTERS;
  protected readonly attentionOptions: Option<AttentionFilter>[] = ATTENTION_FILTERS;
  protected readonly platformOptions = PLATFORM_OPTIONS;
  protected readonly skeletonRows = [0, 1, 2, 3, 4, 5];

  /** An unknown or missing `?status=` falls back to All rather than 404-ing. */
  protected readonly activeStatus = computed<StatusFilter>(() => parseStatus(this.status()));
  protected readonly activeAttention = computed(() => parseAttention(this.show()));
  protected readonly activePlatform = computed(() => parsePlatform(this.platform()));

  /** Brands come from the loaded list, so the dropdown only offers brands that own a campaign. */
  protected readonly brandOptions = computed<Option[]>(() => {
    const byId = new Map<string, string>();
    for (const campaign of this.campaigns()) {
      if (!byId.has(campaign.brandId)) {
        byId.set(campaign.brandId, campaign.brand.name);
      }
    }
    return [...byId.entries()]
      .map(([value, label]) => ({ label, value }))
      .sort((left, right) => left.label.localeCompare(right.label));
  });

  /** A `?brand=` that no campaign uses is dropped rather than shown as a blank chip. */
  protected readonly activeBrand = computed(() => {
    const raw = this.brand();
    return raw && this.brandOptions().some((option) => option.value === raw) ? raw : null;
  });

  /**
   * The wizard's category list plus anything older rows still carry, so a legacy
   * category remains filterable until it is edited away.
   */
  protected readonly categoryOptions = computed<Option[]>(() => {
    const known = new Map(CAMPAIGN_CATEGORY_OPTIONS.map((option) => [option.value, option.label]));
    for (const campaign of this.campaigns()) {
      if (campaign.category && !known.has(campaign.category)) {
        known.set(campaign.category, campaign.category);
      }
    }
    return [...known.entries()].map(([value, label]) => ({ label, value }));
  });

  protected readonly activeCategory = computed(() => {
    const raw = (this.category() ?? '').trim();
    const match = this.categoryOptions().find(
      (option) => option.value.toLowerCase() === raw.toLowerCase(),
    );
    return match?.value ?? null;
  });

  protected readonly filters = computed<CampaignFilters>(() => ({
    status: this.activeStatus(),
    attention: this.activeAttention(),
    brand: this.activeBrand(),
    category: this.activeCategory(),
    platform: this.activePlatform(),
    search: this.search(),
  }));

  protected readonly activeFilterCount = computed(() => activeFilterCount(this.filters()));
  protected readonly hasActiveFilters = computed(() => this.activeFilterCount() > 0);

  protected readonly visibleCampaigns = computed(() =>
    filterCampaigns(this.campaigns(), this.filters()),
  );

  protected readonly countLabel = computed(() => {
    const total = this.visibleCampaigns().length;
    return `${total} ${total === 1 ? 'campaign' : 'campaigns'}`;
  });

  /**
   * "Showing 2 active campaigns ending in the next 7 days for TripAdverts" — a
   * plain-English readout of the URL, so an admin arriving from a dashboard
   * link knows which slice they are looking at.
   */
  protected readonly filterSummary = computed(() => {
    const filters = this.filters();
    if (!this.hasActiveFilters()) {
      return '';
    }
    const parts: string[] = [];
    if (filters.status !== 'ALL') {
      parts.push(filters.status.toLowerCase());
    }
    if (filters.category) {
      parts.push(filters.category);
    }
    let sentence = `Showing ${this.visibleCampaigns().length} ${parts.join(' ')} ${
      this.visibleCampaigns().length === 1 ? 'campaign' : 'campaigns'
    }`.replace(/\s+/g, ' ');
    const attention = ATTENTION_FILTERS.find((option) => option.value === filters.attention);
    if (attention) {
      sentence += ` ${attention.summary}`;
    }
    if (filters.platform) {
      sentence += ` on ${PLATFORM_LABELS[filters.platform]}`;
    }
    if (filters.brand) {
      const brand = this.brandOptions().find((option) => option.value === filters.brand);
      if (brand) {
        sentence += ` for ${brand.label}`;
      }
    }
    if (filters.search.trim()) {
      sentence += ` matching “${filters.search.trim()}”`;
    }
    return `${sentence}.`;
  });

  constructor() {
    void this.load();
  }

  protected tabClass(value: StatusFilter): string {
    return this.activeStatus() === value ? TAB_SELECTED : TAB_IDLE;
  }

  /** Tabs write to the URL; `activeStatus` reads it back through the input. */
  protected setStatus(value: StatusFilter): void {
    this.patchQuery({ status: value === 'ALL' ? null : value });
  }

  protected setAttention(value: AttentionFilter | null): void {
    this.patchQuery({ show: value });
  }

  protected setBrand(value: string | null): void {
    this.patchQuery({ brand: value });
  }

  protected setCategory(value: string | null): void {
    this.patchQuery({ category: value });
  }

  protected setPlatform(value: CampaignPlatform | null): void {
    this.patchQuery({ platform: value });
  }

  protected clearFilters(): void {
    this.search.set('');
    this.patchQuery({ status: null, show: null, brand: null, category: null, platform: null });
  }

  protected createCampaign(): void {
    void this.router.navigate(['/admin/campaigns/new']);
  }

  protected async load(): Promise<void> {
    this.state.set('loading');
    try {
      this.campaigns.set(await this.admin.campaigns());
      this.state.set('ready');
    } catch (error) {
      this.campaigns.set([]);
      this.errorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load campaigns right now.',
      );
      this.state.set('error');
    }
  }

  /** A null value removes the key, so the default view has a clean URL. */
  private patchQuery(queryParams: Params): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }
}
