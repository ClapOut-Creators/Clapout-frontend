import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Whatsapp } from '@primeicons/angular/whatsapp';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ApiError } from '../../core/api/api-error';
import { AdminRepository } from '../../core/data/admin-repository';
import { ClipperAvatar } from '../creator/clipper-avatar';
import { AdminCreator, AdminCreatorFilter, AdminCreatorQuery } from '../../core/models/admin';
import { NOT_ANNOUNCED } from '../../core/util/campaign-format';
import { downloadCsv, toCsv } from '../export/csv';
import {
  initials as initialsOf,
  PAYOUT_METHOD_LABELS,
  socialHandle,
  whatsappLink as whatsappLinkFor,
} from './clipper-format';

type TableState = 'loading' | 'ready' | 'error';

interface SelectOption<T> {
  label: string;
  value: T;
}

const FILTER_OPTIONS: SelectOption<AdminCreatorFilter>[] = [
  { label: 'Not on any campaign', value: 'unregistered' },
  { label: 'On at least one campaign', value: 'registered' },
];

/** "3 campaigns", "1 campaign", or the empty-state wording for a sign-up who never applied. */
export function campaignsLabel(count: number): string {
  if (count === 0) {
    return 'None yet';
  }
  return `${count} ${count === 1 ? 'campaign' : 'campaigns'}`;
}

/** "9 Sept 2026" for the Signed up column; the raw string when it will not parse. */
export function signedUpLabel(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? NOT_ANNOUNCED
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * "All clippers" — every creator account on the platform, one row each, from
 * `GET /admin/creators`. Where the registrations table shows applications
 * (and so can never show a clipper who has not applied), this shows the
 * people: contact details, how to pay them, how many campaigns they are on,
 * whether they have joined the WhatsApp community and when they signed up.
 *
 * Search and the campaign filter are server side; CSV export is client side
 * over exactly the rows shown.
 */
@Component({
  imports: [
    ClipperAvatar,
    ButtonModule,
    FormsModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    SkeletonModule,
    TableModule,
    TagModule,
    Whatsapp,
  ],
  selector: 'app-creators-table',
  templateUrl: './creators-table.html',
})
export class CreatorsTable {
  private readonly admin = inject(AdminRepository);

  protected readonly state = signal<TableState>('loading');
  protected readonly rows = signal<AdminCreator[]>([]);
  protected readonly errorMessage = signal<string>('');

  /** Bound to the box for instant feedback. */
  protected readonly searchInput = signal('');
  /** Debounced copy — only this one triggers a request. */
  protected readonly search = signal('');
  protected readonly filter = signal<AdminCreatorFilter | null>(null);
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  protected readonly filterOptions = FILTER_OPTIONS;
  protected readonly skeletonRows = [0, 1, 2, 3, 4];
  protected readonly notAnnounced = NOT_ANNOUNCED;
  protected readonly campaignsLabel = campaignsLabel;
  protected readonly signedUpLabel = signedUpLabel;

  protected readonly hasActiveFilters = computed(
    () => !!this.search().trim() || this.filter() !== null,
  );

  readonly canExport = computed(() => this.rows().length > 0);

  /** How many rows on screen have never applied — the number Steve asked to see. */
  protected readonly unregisteredCount = computed(
    () => this.rows().filter((row) => row.registrationCount === 0).length,
  );

  constructor() {
    effect(() => {
      void this.load({
        search: this.search().trim() || undefined,
        filter: this.filter() ?? undefined,
      });
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
    this.searchDebounce = setTimeout(() => this.search.set(value), 300);
  }

  protected reload(): void {
    void this.load({
      search: this.search().trim() || undefined,
      filter: this.filter() ?? undefined,
    });
  }

  protected clearFilters(): void {
    this.searchInput.set('');
    this.search.set('');
    this.filter.set(null);
  }

  protected initials(name: string): string {
    return initialsOf(name);
  }

  protected whatsappLink(value: string | null | undefined): string | null {
    return whatsappLinkFor(value);
  }

  protected handle(url: string): string {
    return socialHandle(url) || url;
  }

  protected payoutMethodLabel(row: AdminCreator): string {
    const payout = row.payout;
    if (!payout) {
      return NOT_ANNOUNCED;
    }
    return PAYOUT_METHOD_LABELS[payout.method] ?? payout.method;
  }

  /** Exports exactly the rows on screen, filters included. */
  exportCsv(): void {
    const rows = this.rows();
    if (rows.length === 0) {
      return;
    }
    const csv = toCsv(
      [
        'Clipper',
        'Email',
        'WhatsApp',
        'Phone',
        'Socials',
        'Payout method',
        'Payout number',
        'Payout name',
        'Campaigns',
        'Joined community',
        'Signed up',
      ],
      rows.map((row) => [
        row.fullName,
        row.email,
        row.whatsapp ?? '',
        row.phone ?? '',
        row.socials.map((account) => account.url).join(' '),
        row.payout ? PAYOUT_METHOD_LABELS[row.payout.method] : '',
        row.payout?.accountNumber ?? '',
        row.payout?.accountName ?? '',
        String(row.registrationCount),
        row.communityJoinedAt ?? '',
        row.createdAt,
      ]),
    );
    downloadCsv(`clapout-clippers-${this.filter() ?? 'all'}.csv`, csv);
  }

  private async load(query: AdminCreatorQuery): Promise<void> {
    this.state.set('loading');
    try {
      this.rows.set(await this.admin.creators(query));
      this.state.set('ready');
    } catch (error) {
      this.rows.set([]);
      this.errorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load clippers.',
      );
      this.state.set('error');
    }
  }
}
