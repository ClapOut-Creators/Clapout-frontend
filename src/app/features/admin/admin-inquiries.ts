import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Check } from '@primeicons/angular/check';
import { Times } from '@primeicons/angular/times';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ApiError } from '../../core/api/api-error';
import { AdminRepository } from '../../core/data/admin-repository';
import { InquiryStatus, PartnershipInquiry } from '../../core/models/admin';
import {
  formatDate,
  inquiryStatusLabel,
  inquiryStatusTone,
  NOT_ANNOUNCED,
} from '../../core/util/campaign-format';
import { PageHeader } from '../../shared/admin/page-header';
import { StatCard } from '../../shared/admin/stat-card';

type PageState = 'loading' | 'ready' | 'error';

interface SelectOption<T> {
  label: string;
  value: T;
}

const STATUS_OPTIONS: SelectOption<InquiryStatus>[] = [
  { label: 'New', value: 'NEW' },
  { label: 'Contacted', value: 'CONTACTED' },
  { label: 'Converted', value: 'CONVERTED' },
  { label: 'Closed', value: 'CLOSED' },
];

/**
 * `/admin/inquiries` — the landing page's "Partnership Inquiry" form, as a
 * queue: three headline counts, status + search filters, the table, and a right
 * drawer with every field, the admin note, the status control and the
 * "Create brand from inquiry" hand-off into the brand wizard.
 *
 * Search and the status filter are server side (`GET
 * /admin/partnership-inquiries?status=&search=`).
 */
@Component({
  imports: [
    ButtonModule,
    Check,
    DrawerModule,
    FormsModule,
    InputTextModule,
    MessageModule,
    PageHeader,
    RouterLink,
    SelectModule,
    SkeletonModule,
    StatCard,
    TableModule,
    TagModule,
    TextareaModule,
    Times,
  ],
  selector: 'app-admin-inquiries',
  templateUrl: './admin-inquiries.html',
})
export class AdminInquiries {
  private readonly admin = inject(AdminRepository);
  private readonly messages = inject(MessageService);

  protected readonly state = signal<PageState>('loading');
  protected readonly rows = signal<PartnershipInquiry[]>([]);
  protected readonly errorMessage = signal('');

  /** Bound to the box for instant feedback. */
  protected readonly searchInput = signal('');
  /** Debounced copy — only this one triggers a request. */
  protected readonly search = signal('');
  protected readonly statusFilter = signal<InquiryStatus | null>(null);
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  /** The inquiry open in the detail drawer, or null when it is closed. */
  protected readonly selected = signal<PartnershipInquiry | null>(null);
  protected readonly draftStatus = signal<InquiryStatus>('NEW');
  protected readonly draftNote = signal('');
  protected readonly saving = signal(false);
  protected readonly drawerError = signal('');

  /**
   * Unfiltered copy behind the stat cards, so the counts keep describing the
   * whole queue while the table below is filtered.
   */
  protected readonly all = signal<PartnershipInquiry[] | null>(null);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly skeletonRows = [0, 1, 2, 3, 4];
  protected readonly notAnnounced = NOT_ANNOUNCED;
  protected readonly formatDate = formatDate;
  protected readonly inquiryStatusLabel = inquiryStatusLabel;
  protected readonly inquiryStatusTone = inquiryStatusTone;

  protected readonly newValue = computed(() => this.countOf('NEW'));
  protected readonly contactedValue = computed(() => this.countOf('CONTACTED'));
  protected readonly convertedValue = computed(() => this.countOf('CONVERTED'));

  protected readonly hasActiveFilters = computed(
    () => !!this.search().trim() || this.statusFilter() !== null,
  );

  constructor() {
    effect(() => {
      void this.load({
        status: this.statusFilter() ?? undefined,
        search: this.search().trim() || undefined,
      });
    });

    void this.loadCounts();

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

  protected clearFilters(): void {
    this.searchInput.set('');
    this.search.set('');
    this.statusFilter.set(null);
  }

  protected reload(): void {
    void this.load({
      status: this.statusFilter() ?? undefined,
      search: this.search().trim() || undefined,
    });
    void this.loadCounts();
  }

  // ---------------------------------------------------------------- drawer

  protected open(row: PartnershipInquiry): void {
    this.selected.set(row);
    this.draftStatus.set(row.status);
    this.draftNote.set(row.adminNote ?? '');
    this.drawerError.set('');
  }

  protected close(): void {
    this.selected.set(null);
    this.drawerError.set('');
  }

  protected onDrawerVisibleChange(open: boolean): void {
    if (!open) {
      this.close();
    }
  }

  /** Where "Create brand from inquiry" sends the admin. */
  protected brandWizardParams(row: PartnershipInquiry): Record<string, string> {
    return { inquiryId: row.id };
  }

  protected async save(): Promise<void> {
    const row = this.selected();
    if (!row || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.drawerError.set('');
    try {
      const updated = await this.admin.updateInquiry(row.id, {
        status: this.draftStatus(),
        adminNote: this.draftNote().trim(),
      });
      this.rows.update((rows) => rows.map((item) => (item.id === row.id ? updated : item)));
      this.selected.set(updated);
      this.messages.add({
        severity: 'success',
        summary: 'Inquiry updated',
        detail: `${updated.company || updated.name} is now ${inquiryStatusLabel(
          updated.status,
        ).toLowerCase()}.`,
      });
      void this.loadCounts();
    } catch (error) {
      this.drawerError.set(
        error instanceof ApiError ? error.message : 'We could not save this inquiry.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  // ------------------------------------------------------------------ data

  private countOf(status: InquiryStatus): string {
    const rows = this.all();
    if (rows === null) {
      return NOT_ANNOUNCED;
    }
    return String(rows.filter((row) => row.status === status).length);
  }

  private async loadCounts(): Promise<void> {
    try {
      this.all.set(await this.admin.inquiries());
    } catch {
      this.all.set(null);
    }
  }

  private async load(query: { status?: InquiryStatus; search?: string }): Promise<void> {
    this.state.set('loading');
    try {
      this.rows.set(await this.admin.inquiries(query));
      this.state.set('ready');
    } catch (error) {
      this.rows.set([]);
      this.errorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load partnership requests.',
      );
      this.state.set('error');
    }
  }
}
