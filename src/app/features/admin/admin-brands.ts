import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AngleDoubleLeft } from '@primeicons/angular/angle-double-left';
import { AngleDoubleRight } from '@primeicons/angular/angle-double-right';
import { AngleLeft } from '@primeicons/angular/angle-left';
import { AngleRight } from '@primeicons/angular/angle-right';
import { ChevronDown } from '@primeicons/angular/chevron-down';
import { Search } from '@primeicons/angular/search';
import { Trash } from '@primeicons/angular/trash';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { ApiError } from '../../core/api/api-error';
import { AdminRepository } from '../../core/data/admin-repository';
import { Brand } from '../../core/models/brand';
import { NOT_ANNOUNCED } from '../../shared/utils/campaign-format';
import { BrandLogoTile } from '../../shared/components/brand-logo-tile';
import { PageHeader } from '../../shared/components/page-header';
import { StatCard } from '../../shared/components/stat-card';

type ListState = 'loading' | 'ready' | 'error';

/** Matches the debounce the clippers table uses, so search feels identical. */
const SEARCH_DEBOUNCE_MS = 300;

/** `409 BRAND_IN_USE` is the one delete failure with a specific remedy. */
const BRAND_IN_USE = 'BRAND_IN_USE';

/** Rows per page. The design paints no page-size control, so this is fixed. */
const PAGE_SIZE = 10;

/** How many numbered pages sit either side of the current one before an ellipsis. */
const PAGE_WINDOW = 1;

function formatCount(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString('en-GB') : NOT_ANNOUNCED;
}

/**
 * Brand index (`/admin/brands`). Totals on top, then the brand table with the
 * per-row View / delete actions from the design.
 *
 * Search is server side (`GET /admin/brands?search=`) and debounced, so the
 * table always shows exactly what the API matched rather than a client-side
 * narrowing of a stale page. The stat cards deliberately read from the last
 * *unfiltered* response so typing in the search box never rewrites the totals.
 */
@Component({
  imports: [
    AngleDoubleLeft,
    AngleDoubleRight,
    AngleLeft,
    AngleRight,
    BrandLogoTile,
    ButtonModule,
    ChevronDown,
    FormsModule,
    InputTextModule,
    MessageModule,
    PageHeader,
    RouterLink,
    Search,
    SkeletonModule,
    StatCard,
    TableModule,
    Trash,
  ],
  selector: 'app-admin-brands',
  templateUrl: './admin-brands.html',
})
export class AdminBrands {
  private readonly admin = inject(AdminRepository);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  private readonly confirmations = inject(ConfirmationService);

  protected readonly state = signal<ListState>('loading');
  protected readonly brands = signal<Brand[]>([]);
  protected readonly errorMessage = signal<string>('');

  /** Bound to the box for instant feedback. */
  protected readonly searchInput = signal('');
  /** Debounced copy — only this one triggers a request. */
  protected readonly search = signal('');
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  /**
   * Last unfiltered result, kept so the stat cards keep describing the whole
   * account list while a search narrows the table below them.
   */
  private readonly allBrands = signal<Brand[]>([]);
  /** Ids currently being DELETEd, so only that row's button disables. */
  protected readonly deletingIds = signal<ReadonlySet<string>>(new Set());

  /**
   * True while a *subsequent* fetch is in flight. Re-searching keeps the panel
   * (and the focused search box) mounted and just dims the table, so typing is
   * never interrupted; only the very first load swaps in the skeleton.
   */
  protected readonly refreshing = signal(false);

  /**
   * Plain field, not a signal: `load()` reads it in the synchronous part of the
   * constructor effect, and a signal read there would make the effect depend on
   * state the same call writes.
   */
  private hasLoaded = false;

  protected readonly skeletonCards = [0, 1, 2];
  protected readonly skeletonRows = [0, 1, 2, 3, 4, 5];

  protected readonly hasSearch = computed(() => this.search().trim().length > 0);

  protected readonly totalBrands = computed(() => formatCount(this.allBrands().length));

  /**
   * The design labels this "Active campagin", i.e. campaign volume rather than
   * brand status, so it sums `campaignCount`. `Brand` carries no per-status
   * campaign breakdown, so this is every campaign the brand owns, not only the
   * ACTIVE ones — see the contract gap noted for `GET /admin/brands`.
   */
  protected readonly activeCampaigns = computed(() =>
    formatCount(this.allBrands().reduce((total, brand) => total + (brand.campaignCount || 0), 0)),
  );

  /** Brands nobody has briefed yet — the design paints this number orange. */
  protected readonly needsAttention = computed(() =>
    formatCount(this.allBrands().filter((brand) => brand.campaignCount === 0).length),
  );

  protected readonly countLabel = computed(() => {
    const total = this.brands().length;
    return `${total} ${total === 1 ? 'brand' : 'brands'}`;
  });

  /**
   * Requested page, 1-based. Reads go through `currentPage()` so a shrinking
   * result set (a delete, or a narrower search) can never strand the table on a
   * page that no longer exists.
   */
  private readonly requestedPage = signal(1);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.brands().length / PAGE_SIZE)),
  );

  protected readonly currentPage = computed(() =>
    Math.min(Math.max(1, this.requestedPage()), this.totalPages()),
  );

  /** The rows actually rendered: the table is fed one page at a time. */
  protected readonly pagedBrands = computed(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.brands().slice(start, start + PAGE_SIZE);
  });

  /** Every page number, for the "Page [n] of N" jump control. */
  protected readonly pageOptions = computed(() =>
    Array.from({ length: this.totalPages() }, (_unused, index) => index + 1),
  );

  /**
   * The `1 2 3 … 10` strip: first and last page always, a window around the
   * current one, and `null` wherever the design draws an ellipsis.
   */
  protected readonly pageItems = computed<(number | null)[]>(() => {
    const total = this.totalPages();
    const windowSize = PAGE_WINDOW * 2 + 1;
    if (total <= windowSize + 4) {
      return this.pageOptions();
    }
    const current = this.currentPage();
    const start = Math.min(Math.max(1, current - PAGE_WINDOW), total - windowSize + 1);
    const items: (number | null)[] = [];
    if (start > 1) {
      items.push(1);
    }
    if (start > 2) {
      items.push(null);
    }
    for (let page = start; page < start + windowSize; page += 1) {
      items.push(page);
    }
    if (start + windowSize < total) {
      items.push(null);
    }
    if (start + windowSize <= total) {
      items.push(total);
    }
    return items;
  });

  constructor() {
    effect(() => {
      // Re-query whenever the debounced term changes; the first pass runs with
      // an empty term and seeds the totals.
      void this.load(this.search());
    });

    inject(DestroyRef).onDestroy(() => {
      if (this.searchDebounce !== null) {
        clearTimeout(this.searchDebounce);
      }
    });
  }

  /** Keystrokes update the box immediately, the query 300 ms after typing stops. */
  protected onSearchInput(value: string): void {
    this.searchInput.set(value);
    if (this.searchDebounce !== null) {
      clearTimeout(this.searchDebounce);
    }
    this.searchDebounce = setTimeout(() => this.search.set(value), SEARCH_DEBOUNCE_MS);
  }

  protected clearSearch(): void {
    if (this.searchDebounce !== null) {
      clearTimeout(this.searchDebounce);
      this.searchDebounce = null;
    }
    this.searchInput.set('');
    this.search.set('');
  }

  protected reload(): void {
    void this.load(this.search());
  }

  protected goToPage(page: number): void {
    this.requestedPage.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  /** True for the page the table is showing, so the strip can paint it filled. */
  protected isCurrentPage(page: number): boolean {
    return page === this.currentPage();
  }

  protected createBrand(): void {
    void this.router.navigate(['/admin/brands/new']);
  }

  protected statusLabel(brand: Brand): string {
    return brand.status === 'ACTIVE' ? 'Active' : 'Inactive';
  }

  /** Green pill for ACTIVE, neutral grey otherwise — straight from the design. */
  protected statusClass(brand: Brand): string {
    return brand.status === 'ACTIVE'
      ? 'bg-[#E1FFE1] text-[#16AC20]'
      : 'bg-[#F1F1F1] text-[#7B7B7B]';
  }

  protected isDeleting(id: string): boolean {
    return this.deletingIds().has(id);
  }

  protected confirmDelete(brand: Brand): void {
    if (this.isDeleting(brand.id)) {
      return;
    }
    this.confirmations.confirm({
      header: 'Delete brand',
      message: `Delete ${brand.name}? This cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => void this.deleteBrand(brand),
    });
  }

  private async deleteBrand(brand: Brand): Promise<void> {
    this.deletingIds.update((ids) => new Set(ids).add(brand.id));
    try {
      await this.admin.deleteBrand(brand.id);
      this.brands.update((rows) => rows.filter((row) => row.id !== brand.id));
      this.allBrands.update((rows) => rows.filter((row) => row.id !== brand.id));
      this.messages.add({
        severity: 'success',
        summary: 'Brand deleted',
        detail: `${brand.name} has been removed.`,
      });
    } catch (error) {
      const conflict =
        error instanceof ApiError && (error.status === 409 || error.code === BRAND_IN_USE);
      this.messages.add({
        severity: 'error',
        summary: 'Could not delete brand',
        detail: conflict
          ? "This brand still has campaigns and can't be deleted."
          : error instanceof ApiError
            ? error.message
            : 'Please try again in a moment.',
      });
    } finally {
      this.deletingIds.update((ids) => {
        const next = new Set(ids);
        next.delete(brand.id);
        return next;
      });
    }
  }

  private async load(search: string): Promise<void> {
    const term = search.trim();
    if (this.hasLoaded) {
      this.refreshing.set(true);
    } else {
      this.state.set('loading');
    }
    this.errorMessage.set('');
    try {
      const rows = await this.admin.brands(term || undefined);
      this.brands.set(rows);
      // A new result set is a new list; page 5 of the old one means nothing here.
      this.requestedPage.set(1);
      if (!term) {
        this.allBrands.set(rows);
      }
      this.hasLoaded = true;
      this.state.set('ready');
    } catch (error) {
      this.brands.set([]);
      this.errorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load brands right now.',
      );
      // Back to the skeleton on the next attempt — the panel is gone anyway.
      this.hasLoaded = false;
      this.state.set('error');
    } finally {
      this.refreshing.set(false);
    }
  }
}
