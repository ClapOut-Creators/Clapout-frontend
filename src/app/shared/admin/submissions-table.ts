import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExternalLink } from '@primeicons/angular/external-link';
import { Facebook } from '@primeicons/angular/facebook';
import { Instagram } from '@primeicons/angular/instagram';
import { Tiktok } from '@primeicons/angular/tiktok';
import { Twitter } from '@primeicons/angular/twitter';
import { Whatsapp } from '@primeicons/angular/whatsapp';
import { Youtube } from '@primeicons/angular/youtube';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ApiError } from '../../core/api/api-error';
import { AdminRepository } from '../../core/data/admin-repository';
import { AdminSubmission, AdminSubmissionQuery } from '../../core/models/admin';
import { SubmissionStatus } from '../../core/models/submission';
import { PayoutMethod } from '../../core/models/user';
import {
  formatDate,
  formatMoneyExact,
  formatViews,
  NOT_ANNOUNCED,
  platformLabel,
  submissionStatusLabel,
  submissionStatusTone,
} from '../../core/util/campaign-format';
import { postUrlLabel } from '../../core/util/platform-url';
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

const STATUS_OPTIONS: SelectOption<SubmissionStatus>[] = [
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Under review', value: 'UNDER_REVIEW' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Paid', value: 'PAID' },
];

/**
 * The payout the backend will freeze on approval: `verifiedViews / 1000 * cpm`,
 * rounded to two decimals. Exported so the arithmetic behind the dialog's live
 * preview is unit-tested rather than eyeballed.
 */
export function previewPayout(verifiedViews: number | null, cpm: number | null): number | null {
  if (verifiedViews === null || cpm === null || !Number.isFinite(verifiedViews)) {
    return null;
  }
  return Math.round((verifiedViews / 1000) * cpm * 100) / 100;
}

/**
 * Admin review table for content submissions, modelled on `ClippersTable`:
 * server-side search and filters, client-side CSV export of exactly the rows on
 * screen, and a review dialog that owns the whole verify → approve → pay path.
 *
 * Used standalone at `/admin/submissions` and embedded on a campaign's admin
 * detail page with `campaignSlug` preset and the toolbar hidden.
 */
@Component({
  imports: [
    ButtonModule,
    DialogModule,
    ExternalLink,
    Facebook,
    FormsModule,
    InputNumberModule,
    InputTextModule,
    Instagram,
    MessageModule,
    SelectModule,
    SkeletonModule,
    TableModule,
    TagModule,
    TextareaModule,
    Tiktok,
    Twitter,
    Whatsapp,
    Youtube,
  ],
  selector: 'app-submissions-table',
  templateUrl: './submissions-table.html',
})
export class SubmissionsTable {
  /** Preset on a campaign page; when set the campaign filter is hidden. */
  readonly campaignSlug = input<string>();
  /** Scopes every query to one brand's campaigns (server-side `?brandId=`). */
  readonly brandId = input<string>();
  /** Scopes to a single clipper's registration. */
  readonly registrationId = input<string>();
  /** Options for the campaign filter, from `GET /admin/campaigns`. */
  readonly campaignOptions = input<SelectOption<string>[]>([]);
  /** Hides the toolbar entirely (embedded, space-constrained usage). */
  readonly showToolbar = input(true);

  /** Fires after a successful review PATCH, so a host page can refresh totals. */
  readonly reviewed = output<void>();

  private readonly admin = inject(AdminRepository);
  private readonly messages = inject(MessageService);
  private readonly confirmations = inject(ConfirmationService);

  protected readonly state = signal<TableState>('loading');
  protected readonly rows = signal<AdminSubmission[]>([]);
  protected readonly errorMessage = signal('');

  /** Bound to the box for instant feedback. */
  protected readonly searchInput = signal('');
  /** Debounced copy — only this one triggers a request. */
  protected readonly search = signal('');
  protected readonly statusFilter = signal<SubmissionStatus | null>(null);
  protected readonly campaignFilter = signal<string | null>(null);
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  /** The row open in the review dialog, or null when it is closed. */
  protected readonly reviewRow = signal<AdminSubmission | null>(null);
  protected readonly verifiedViews = signal<number | null>(null);
  protected readonly reviewNote = signal('');
  protected readonly saving = signal(false);
  protected readonly reviewError = signal('');
  /** The row whose screenshot is open full size. */
  protected readonly previewRow = signal<AdminSubmission | null>(null);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly skeletonRows = [0, 1, 2, 3, 4];
  protected readonly notAnnounced = NOT_ANNOUNCED;

  protected readonly formatDate = formatDate;
  protected readonly formatMoneyExact = formatMoneyExact;
  protected readonly formatViews = formatViews;
  protected readonly platformLabel = platformLabel;
  protected readonly postUrlLabel = postUrlLabel;
  protected readonly submissionStatusLabel = submissionStatusLabel;
  protected readonly submissionStatusTone = submissionStatusTone;

  protected readonly hasActiveFilters = computed(
    () => !!this.search().trim() || this.statusFilter() !== null || this.campaignFilter() !== null,
  );

  /** Public so a host page can render Export in its own section header. */
  readonly canExport = computed(() => this.rows().length > 0);

  /** Live payout preview inside the dialog, in the campaign's currency. */
  protected readonly payoutPreview = computed(() => {
    const row = this.reviewRow();
    if (!row) {
      return null;
    }
    return previewPayout(this.verifiedViews(), row.campaign.cpm);
  });

  protected readonly canApprove = computed(
    () => this.verifiedViews() !== null && (this.reviewRow()?.campaign.cpm ?? null) !== null,
  );

  constructor() {
    effect(() => {
      // `campaignSlug` wins over the dropdown so an embedded table can never
      // widen its own scope.
      void this.load({
        brandId: this.brandId(),
        registrationId: this.registrationId(),
        campaignSlug: this.campaignSlug() ?? this.campaignFilter() ?? undefined,
        status: this.statusFilter() ?? undefined,
        search: this.search().trim() || undefined,
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
      brandId: this.brandId(),
      registrationId: this.registrationId(),
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

  protected initials(name: string): string {
    return (
      (name ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || '?'
    );
  }

  protected payoutMethodLabel(row: AdminSubmission): string {
    const payout = row.creator.payout;
    if (!payout) {
      return NOT_ANNOUNCED;
    }
    return PAYOUT_METHOD_LABELS[payout.method] ?? payout.method;
  }

  /**
   * wa.me target for a creator's WhatsApp value — the same rule the clippers
   * table uses: a phone number becomes digits, anything else stays a username.
   */
  protected whatsappLink(value: string | null | undefined): string | null {
    const raw = (value ?? '').trim().replace(/^@+/, '');
    if (!raw) {
      return null;
    }
    const isPhoneNumber = /^\+?[\d\s().-]+$/.test(raw);
    const target = isPhoneNumber ? raw.replace(/\D/g, '') : raw;
    return target ? `https://wa.me/${encodeURIComponent(target)}` : null;
  }

  // ------------------------------------------------------------ screenshot

  protected openPreview(row: AdminSubmission): void {
    this.previewRow.set(row);
  }

  protected closePreview(): void {
    this.previewRow.set(null);
  }

  protected onPreviewVisibleChange(open: boolean): void {
    if (!open) {
      this.closePreview();
    }
  }

  // ---------------------------------------------------------- review dialog

  protected openReview(row: AdminSubmission): void {
    this.reviewRow.set(row);
    // Pre-filling with the claim saves the common case where the screenshot
    // confirms exactly what the clipper reported.
    this.verifiedViews.set(row.verifiedViews ?? row.claimedViews ?? null);
    this.reviewNote.set(row.reviewNote ?? '');
    this.reviewError.set('');
  }

  protected closeReview(): void {
    this.reviewRow.set(null);
    this.reviewError.set('');
  }

  protected onReviewVisibleChange(open: boolean): void {
    if (!open) {
      this.closeReview();
    }
  }

  /** Paying moves money in the real world, so it asks first. */
  protected confirmMarkPaid(): void {
    const row = this.reviewRow();
    if (!row) {
      return;
    }
    const amount = formatMoneyExact(row.campaign.currency, row.payoutAmount);
    this.confirmations.confirm({
      header: 'Mark this clip as paid?',
      message: `This adds ${amount} to the campaign's paid-out total. Only do it once the transfer has gone through.`,
      acceptLabel: 'Mark as paid',
      rejectLabel: 'Not yet',
      accept: () => void this.setStatus('PAID'),
    });
  }

  protected async setStatus(status: SubmissionStatus): Promise<void> {
    const row = this.reviewRow();
    if (!row || this.saving()) {
      return;
    }
    if (status === 'APPROVED' && !this.canApprove()) {
      this.reviewError.set(
        row.campaign.cpm === null
          ? 'This campaign has no CPM, so a payout cannot be calculated. Add a rate to the campaign first.'
          : 'Enter the verified view count before approving.',
      );
      return;
    }

    this.saving.set(true);
    this.reviewError.set('');
    try {
      const updated = await this.admin.updateSubmission(row.id, {
        status,
        ...(this.verifiedViews() !== null ? { verifiedViews: this.verifiedViews() } : {}),
        reviewNote: this.reviewNote().trim(),
      });
      this.rows.update((rows) => rows.map((item) => (item.id === row.id ? updated : item)));
      this.messages.add({
        severity: 'success',
        summary: 'Submission updated',
        detail: `${updated.creator.fullName}'s clip is now ${submissionStatusLabel(
          updated.status,
        ).toLowerCase()}.`,
      });
      this.closeReview();
      this.reviewed.emit();
    } catch (error) {
      this.reviewError.set(reviewErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  // ---------------------------------------------------------------- export

  /**
   * Exports exactly the rows on screen, filters included. Public so a host page
   * can drive it from an Export button in its own section header.
   */
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
        'Campaign',
        'Platform',
        'Post URL',
        'Caption',
        'Claimed views',
        'Verified views',
        'Currency',
        'Payout',
        'Payout method',
        'Payout number',
        'Payout name',
        'Status',
        'Posted',
        'Submitted',
        'Review note',
      ],
      rows.map((row) => [
        row.creator.fullName,
        row.creator.email,
        row.creator.whatsapp ?? '',
        row.creator.phone ?? '',
        row.campaign.title || row.campaign.brandName,
        platformLabel(row.platform),
        row.postUrl,
        row.caption ?? '',
        row.claimedViews ?? '',
        row.verifiedViews ?? '',
        row.campaign.currency,
        row.payoutAmount ?? '',
        row.creator.payout ? PAYOUT_METHOD_LABELS[row.creator.payout.method] : '',
        row.creator.payout?.accountNumber ?? '',
        row.creator.payout?.accountName ?? '',
        submissionStatusLabel(row.status),
        row.postedAt ?? '',
        row.createdAt,
        row.reviewNote ?? '',
      ]),
    );
    const scope = this.campaignSlug() ?? this.campaignFilter() ?? 'all-campaigns';
    downloadCsv(`clapout-submissions-${scope}.csv`, csv);
  }

  private async load(query: AdminSubmissionQuery): Promise<void> {
    this.state.set('loading');
    try {
      this.rows.set(await this.admin.submissions(query));
      this.state.set('ready');
    } catch (error) {
      this.rows.set([]);
      this.errorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load submissions.',
      );
      this.state.set('error');
    }
  }
}

/** Contract failures from `PATCH /admin/submissions/:id`, in admin language. */
export function reviewErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'We could not update this submission. Please try again.';
  }
  switch (error.code) {
    case 'CAMPAIGN_CPM_MISSING':
      return 'This campaign has no CPM, so a payout cannot be calculated. Add a rate to the campaign first.';
    case 'NOT_APPROVED':
      return 'Approve the clip before marking it paid.';
    case 'SUBMISSION_NOT_FOUND':
      return 'This submission no longer exists. Refresh the table.';
    default:
      return error.message;
  }
}
