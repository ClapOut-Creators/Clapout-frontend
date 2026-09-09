import { Component, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Download } from '@primeicons/angular/download';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { ApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth-service';
import { AdminRepository } from '../../core/data/admin-repository';
import { BrandDetail, BrandStatus } from '../../core/models/brand';
import { NOT_ANNOUNCED } from '../../core/util/campaign-format';
import { BrandLogoTile } from '../../shared/admin/brand-logo-tile';
import { CampaignCompactCard } from '../../shared/admin/campaign-compact-card';
import { ClippersTable } from '../../shared/admin/clippers-table';
import { PageHeader } from '../../shared/admin/page-header';
import { StatCard } from '../../shared/admin/stat-card';

type DetailState = 'loading' | 'ready' | 'not-found' | 'error';

/**
 * ISO code shown in front of the symbol on the Revenue card, e.g. `GHS ₵ 40,000.00`.
 * The brand contract carries no currency of its own, so the symbol comes from
 * the brand's campaigns and this map turns it into the code the design prints.
 */
const CURRENCY_CODES: Record<string, string> = {
  '₵': 'GHS',
  $: 'USD',
};

/** Fallback when a brand has no campaigns to borrow a currency symbol from. */
const DEFAULT_CURRENCY = '₵';

/**
 * One brand's account page: identity and contacts, its totals, the campaigns it
 * owns and the clippers who registered for them.
 *
 * The campaign search is client side because `GET /admin/brands/:id` already
 * returns the brand's full campaign list — there is no per-brand campaign
 * endpoint to query.
 */
@Component({
  imports: [
    BrandLogoTile,
    ButtonModule,
    CampaignCompactCard,
    ClippersTable,
    Download,
    FormsModule,
    InputTextModule,
    MessageModule,
    PageHeader,
    RouterLink,
    SkeletonModule,
    StatCard,
  ],
  selector: 'app-admin-brand-detail',
  templateUrl: './admin-brand-detail.html',
})
export class AdminBrandDetail {
  /** Bound from the `:id` segment via `withComponentInputBinding()`. */
  readonly id = input.required<string>();

  private readonly admin = inject(AdminRepository);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  /** The embedded table owns the rows, so Export delegates straight to it. */
  private readonly clippers = viewChild(ClippersTable);

  protected readonly state = signal<DetailState>('loading');
  protected readonly brand = signal<BrandDetail | null>(null);
  protected readonly errorMessage = signal<string>('');
  protected readonly savingStatus = signal(false);
  protected readonly campaignSearch = signal('');

  protected readonly skeletonCards = [0, 1, 2];
  protected readonly skeletonRows = [0, 1, 2];

  /** The signed-in admin doubles as the account manager the design shows. */
  protected readonly accountManager = computed(() => this.auth.user());

  /** The brand name lives in the header card and the breadcrumb, never the h1. */
  protected readonly headerTrail = computed(() => this.brand()?.name);

  protected readonly isActive = computed(() => this.brand()?.status === 'ACTIVE');
  /** Design copy. A paused brand offers the inverse action instead. */
  protected readonly statusActionLabel = computed(() =>
    this.isActive() ? 'Pause Campaign' : 'Activate',
  );

  protected readonly campaigns = computed(() => this.brand()?.campaigns ?? []);

  protected readonly visibleCampaigns = computed(() => {
    const term = this.campaignSearch().trim().toLowerCase();
    if (!term) {
      return this.campaigns();
    }
    return this.campaigns().filter((campaign) =>
      [campaign.title, campaign.category].some((field) =>
        (field ?? '').toLowerCase().includes(term),
      ),
    );
  });

  protected readonly totalCampaignsLabel = computed(() =>
    this.formatCount(this.brand()?.stats.totalCampaigns),
  );
  protected readonly registrationLabel = computed(() =>
    this.formatCount(this.brand()?.stats.totalRegistrations),
  );
  protected readonly revenueLabel = computed(() => this.formatRevenue(this.brand()?.stats.revenue));

  constructor() {
    effect(() => {
      void this.load(this.id());
    });
  }

  protected reload(): void {
    void this.load(this.id());
  }

  protected editBrand(): void {
    void this.router.navigate(['/admin/brands', this.id(), 'edit']);
  }

  protected createCampaign(): void {
    void this.router.navigate(['/admin/campaigns/new'], { queryParams: { brandId: this.id() } });
  }

  protected clearCampaignSearch(): void {
    this.campaignSearch.set('');
  }

  protected exportClippers(): void {
    this.clippers()?.exportCsv();
  }

  protected canExportClippers(): boolean {
    return this.clippers()?.canExport() ?? false;
  }

  /** Stand-in for the avatar the design shows next to each person. */
  protected initials(name: string | null | undefined): string {
    return (
      (name ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || '?'
    );
  }

  /** Pause an active brand, or bring a paused one back. */
  protected async toggleStatus(): Promise<void> {
    const brand = this.brand();
    if (!brand || this.savingStatus()) {
      return;
    }
    const previous = brand.status;
    const next: BrandStatus = previous === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    this.savingStatus.set(true);
    // Optimistic: the pill and the button label flip immediately and are put
    // back if the PATCH fails.
    this.brand.set({ ...brand, status: next });
    try {
      const updated = await this.admin.updateBrand(brand.id, { status: next });
      this.brand.update((current) => (current ? { ...current, ...updated } : current));
      this.messages.add({
        severity: 'success',
        summary: next === 'ACTIVE' ? 'Brand activated' : 'Brand paused',
        detail: `${brand.name} is now ${next === 'ACTIVE' ? 'active' : 'inactive'}.`,
      });
    } catch (error) {
      this.brand.update((current) => (current ? { ...current, status: previous } : current));
      this.messages.add({
        severity: 'error',
        summary: 'Could not update this brand',
        detail: error instanceof ApiError ? error.message : 'Please try again in a moment.',
      });
    } finally {
      this.savingStatus.set(false);
    }
  }

  private formatCount(value: number | null | undefined): string {
    return value !== null && value !== undefined && Number.isFinite(value)
      ? value.toLocaleString('en-GB')
      : NOT_ANNOUNCED;
  }

  /**
   * `GHS ₵ 40,000.00` — the design prints an ISO code, the symbol and two
   * decimals. `Brand`/`BrandStats` carry no currency, so the symbol is assumed
   * to be the one used by this brand's first campaign (all of a brand's
   * campaigns are priced in one currency in practice) and falls back to '₵'.
   * An unmapped symbol renders without a code rather than guessing one.
   */
  private formatRevenue(revenue: number | null | undefined): string {
    const symbol = this.campaigns()[0]?.currency || DEFAULT_CURRENCY;
    if (revenue === null || revenue === undefined || !Number.isFinite(revenue)) {
      return `${CURRENCY_CODES[symbol] ?? symbol} ${NOT_ANNOUNCED}`;
    }
    const amount = revenue.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    // Currency code OR symbol, never both ("GHS 2,000.00" / "₵ 2,000.00").
    const code = CURRENCY_CODES[symbol];
    return code ? `${code} ${amount}` : `${symbol}\u2009${amount}`;
  }

  private async load(id: string): Promise<void> {
    this.state.set('loading');
    this.errorMessage.set('');
    try {
      this.brand.set(await this.admin.brand(id));
      this.state.set('ready');
    } catch (error) {
      this.brand.set(null);
      if (error instanceof ApiError && error.status === 404) {
        this.state.set('not-found');
        return;
      }
      this.errorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load this brand.',
      );
      this.state.set('error');
    }
  }
}
