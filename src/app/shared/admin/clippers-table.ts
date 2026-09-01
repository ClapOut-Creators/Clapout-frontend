import { Component, computed, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ApiError } from '../../core/api/api-error';
import { AdminRepository } from '../../core/data/admin-repository';
import { AdminRegistration } from '../../core/models/admin';
import { PayoutMethod } from '../../core/models/user';
import { RegistrationStatus } from '../../core/models/registration';
import {
  formatDate,
  NOT_ANNOUNCED,
  platformLabel,
  registrationStatusLabel,
  registrationStatusTone,
} from '../../core/util/campaign-format';
import { downloadCsv, toCsv } from '../export/csv';

type TableState = 'loading' | 'ready' | 'error';

interface SelectOption<T> {
  label: string;
  value: T;
}

const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
  MTN_MOMO: 'MTN MoMo',
  TELECEL_CASH: 'Telecel Cash',
  AT_MONEY: 'AT Money',
};

const STATUS_OPTIONS: SelectOption<RegistrationStatus>[] = [
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Under review', value: 'UNDER_REVIEW' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'Rejected', value: 'REJECTED' },
];

/**
 * "Registered Clippers" — the admin's view of who applied, how to reach them and
 * how to pay them. Used standalone at `/admin/registrations` and embedded on a
 * campaign's admin detail page with `campaignSlug` preset.
 *
 * Search and the campaign/status filters are server side (`GET
 * /admin/registrations?search=&campaignSlug=&status=`); CSV export is client
 * side over exactly the rows currently shown.
 */
@Component({
  imports: [
    ButtonModule,
    FormsModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    SkeletonModule,
    TableModule,
    TagModule,
  ],
  selector: 'app-clippers-table',
  templateUrl: './clippers-table.html',
})
export class ClippersTable {
  /** Preset on a campaign page; when set the campaign filter is hidden. */
  readonly campaignSlug = input<string>();
  /** Options for the campaign filter, from `GET /admin/campaigns`. */
  readonly campaignOptions = input<SelectOption<string>[]>([]);
  /** Hides the toolbar entirely (embedded, space-constrained usage). */
  readonly showToolbar = input(true);

  private readonly admin = inject(AdminRepository);
  private readonly messages = inject(MessageService);

  protected readonly state = signal<TableState>('loading');
  protected readonly rows = signal<AdminRegistration[]>([]);
  protected readonly errorMessage = signal<string>('');
  /** Ids currently being PATCHed, so only that row's control disables. */
  protected readonly savingIds = signal<ReadonlySet<string>>(new Set());

  /** Bound to the box for instant feedback. */
  protected readonly searchInput = signal('');
  /** Debounced copy — only this one triggers a request. */
  protected readonly search = signal('');
  protected readonly statusFilter = signal<RegistrationStatus | null>(null);
  protected readonly campaignFilter = signal<string | null>(null);
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly skeletonRows = [0, 1, 2, 3, 4];

  protected readonly formatDate = formatDate;
  protected readonly platformLabel = platformLabel;
  protected readonly registrationStatusLabel = registrationStatusLabel;
  protected readonly registrationStatusTone = registrationStatusTone;

  /** True when a filter is narrowing an otherwise non-empty dataset. */
  protected readonly hasActiveFilters = computed(
    () => !!this.search().trim() || this.statusFilter() !== null || this.campaignFilter() !== null,
  );

  constructor() {
    effect(() => {
      // Re-query whenever the effective filter set changes. `campaignSlug` wins
      // over the dropdown so an embedded table can never widen its own scope.
      const query = {
        campaignSlug: this.campaignSlug() ?? this.campaignFilter() ?? undefined,
        status: this.statusFilter() ?? undefined,
        search: this.search().trim() || undefined,
      };
      void this.load(query);
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
      campaignSlug: this.campaignSlug() ?? this.campaignFilter() ?? undefined,
      status: this.statusFilter() ?? undefined,
      search: this.search().trim() || undefined,
    });
  }

  protected clearFilters(): void {
    this.searchInput.set('');
    this.search.set('');
    this.statusFilter.set(null);
    this.campaignFilter.set(null);
  }

  protected payoutSummary(row: AdminRegistration): string {
    const payout = row.creator.payout;
    if (!payout) {
      return NOT_ANNOUNCED;
    }
    const method = PAYOUT_METHOD_LABELS[payout.method] ?? payout.method;
    return `${method} · ${payout.accountNumber} · ${payout.accountName}`;
  }

  protected isSaving(id: string): boolean {
    return this.savingIds().has(id);
  }

  /** Row action: move an application through review. */
  protected async changeStatus(row: AdminRegistration, status: RegistrationStatus): Promise<void> {
    if (status === row.status || this.isSaving(row.id)) {
      return;
    }

    this.savingIds.update((ids) => new Set(ids).add(row.id));
    try {
      const updated = await this.admin.updateRegistrationStatus(row.id, status);
      this.rows.update((rows) => rows.map((item) => (item.id === row.id ? updated : item)));
      this.messages.add({
        severity: 'success',
        summary: 'Status updated',
        detail: `${row.creator.fullName} is now ${registrationStatusLabel(status).toLowerCase()}.`,
      });
    } catch (error) {
      this.messages.add({
        severity: 'error',
        summary: 'Could not update status',
        detail: error instanceof ApiError ? error.message : 'Please try again in a moment.',
      });
    } finally {
      this.savingIds.update((ids) => {
        const next = new Set(ids);
        next.delete(row.id);
        return next;
      });
    }
  }

  /** Exports exactly the rows on screen, filters included. */
  protected exportCsv(): void {
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
        'Campaign',
        'Platform',
        'Account URL',
        'Payout method',
        'Payout number',
        'Payout name',
        'Status',
        'Applied',
      ],
      rows.map((row) => [
        row.creator.fullName,
        row.creator.email,
        row.creator.whatsapp ?? '',
        row.creator.phone ?? '',
        row.campaign.title || row.campaign.brandName,
        platformLabel(row.platform),
        row.accountUrl,
        row.creator.payout ? PAYOUT_METHOD_LABELS[row.creator.payout.method] : '',
        row.creator.payout?.accountNumber ?? '',
        row.creator.payout?.accountName ?? '',
        registrationStatusLabel(row.status),
        row.createdAt,
      ]),
    );
    const scope = this.campaignSlug() ?? this.campaignFilter() ?? 'all-campaigns';
    downloadCsv(`clapout-clippers-${scope}.csv`, csv);
  }

  private async load(query: {
    campaignSlug?: string;
    status?: RegistrationStatus;
    search?: string;
  }): Promise<void> {
    this.state.set('loading');
    try {
      this.rows.set(await this.admin.registrations(query));
      this.state.set('ready');
    } catch (error) {
      this.rows.set([]);
      this.errorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load registrations.',
      );
      this.state.set('error');
    }
  }
}
