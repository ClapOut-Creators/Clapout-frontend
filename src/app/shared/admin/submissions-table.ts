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
import { CheckboxModule } from 'primeng/checkbox';
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
import { Submission, SubmissionStatus, SubmissionViewCheck } from '../../core/models/submission';
import { PayoutMethod } from '../../core/models/user';
import {
  formatDate,
  formatDateTime,
  formatMoneyExact,
  formatViews,
  NOT_ANNOUNCED,
  platformLabel,
  submissionStatusLabel,
  submissionStatusTone,
} from '../../core/util/campaign-format';
import { postUrlLabel } from '../../core/util/platform-url';
import { shortElapsed } from '../../core/util/relative-time';
import { downloadCsv, toCsv } from '../export/csv';
import { SnapchatIcon } from '../icons/snapchat-icon';

type TableState = 'loading' | 'ready' | 'error';
type HistoryState = 'idle' | 'loading' | 'ready' | 'error';

/** What the "Stale views" filter counts as stale, in days. */
export const STALE_VIEWS_DAYS = 7;

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
 * "Views checked · 3d ago" for an approved clip, or null when there is nothing
 * to report. A `viewsCheckedAt` still equal to `reviewedAt` means nobody has
 * re-checked the figure since approval, which reads better as "at approval"
 * than as an age that only says how long ago the clip was reviewed.
 */
export function viewsCheckedLabel(
  row: Pick<Submission, 'viewsCheckedAt' | 'reviewedAt'>,
  now: number = Date.now(),
): string | null {
  if (!row.viewsCheckedAt) {
    return null;
  }
  if (row.reviewedAt && row.viewsCheckedAt === row.reviewedAt) {
    return 'at approval';
  }
  return shortElapsed(row.viewsCheckedAt, now);
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
    CheckboxModule,
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
    SnapchatIcon,
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

  /**
   * Fires after a successful review PATCH or view check, so a host page can
   * refresh totals. Both paths move `verifiedViews` and the payout, so they
   * share one output rather than making every host listen twice.
   */
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
  /** "Stale views (7d+)" — approved clips nobody has re-counted in a week. */
  protected readonly staleViewsOnly = signal(false);
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  /** The row open in the review dialog, or null when it is closed. */
  protected readonly reviewRow = signal<AdminSubmission | null>(null);
  protected readonly verifiedViews = signal<number | null>(null);
  protected readonly reviewNote = signal('');
  protected readonly saving = signal(false);
  protected readonly reviewError = signal('');
  /** The row whose screenshot is open full size. */
  protected readonly previewRow = signal<AdminSubmission | null>(null);

  /** The row open in the "Update views" dialog, or null when it is closed. */
  protected readonly viewCheckRow = signal<AdminSubmission | null>(null);
  protected readonly newViews = signal<number | null>(null);
  protected readonly viewCheckNote = signal('');
  protected readonly viewCheckSaving = signal(false);
  protected readonly viewCheckError = signal('');

  /** View history of the row in the preview dialog, fetched when it opens. */
  protected readonly history = signal<SubmissionViewCheck[]>([]);
  protected readonly historyState = signal<HistoryState>('idle');

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly skeletonRows = [0, 1, 2, 3, 4];
  protected readonly notAnnounced = NOT_ANNOUNCED;
  protected readonly staleViewsDays = STALE_VIEWS_DAYS;

  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;
  protected readonly formatMoneyExact = formatMoneyExact;
  protected readonly formatViews = formatViews;
  protected readonly platformLabel = platformLabel;
  protected readonly postUrlLabel = postUrlLabel;
  protected readonly submissionStatusLabel = submissionStatusLabel;
  protected readonly submissionStatusTone = submissionStatusTone;
  protected readonly viewsCheckedLabel = viewsCheckedLabel;

  protected readonly hasActiveFilters = computed(
    () =>
      !!this.search().trim() ||
      this.statusFilter() !== null ||
      this.campaignFilter() !== null ||
      this.staleViewsOnly(),
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

  /** The same arithmetic in the "Update views" dialog, on the fresh count. */
  protected readonly viewCheckPayoutPreview = computed(() => {
    const row = this.viewCheckRow();
    return row ? previewPayout(this.newViews(), row.campaign.cpm) : null;
  });

  protected readonly canSaveViewCheck = computed(
    () => this.newViews() !== null && (this.viewCheckRow()?.campaign.cpm ?? null) !== null,
  );

  constructor() {
    effect(() => {
      void this.load(this.currentQuery());
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

  /**
   * `campaignSlug` wins over the dropdown so an embedded table can never widen
   * its own scope. Read inside the load effect, so every filter signal it
   * touches is a dependency of that effect.
   */
  private currentQuery(): AdminSubmissionQuery {
    return {
      brandId: this.brandId(),
      registrationId: this.registrationId(),
      campaignSlug: this.campaignSlug() ?? this.campaignFilter() ?? undefined,
      status: this.statusFilter() ?? undefined,
      search: this.search().trim() || undefined,
      staleViewsDays: this.staleViewsOnly() ? STALE_VIEWS_DAYS : undefined,
    };
  }

  protected reload(): void {
    void this.load(this.currentQuery());
  }

  protected clearFilters(): void {
    this.searchInput.set('');
    this.search.set('');
    this.statusFilter.set(null);
    this.campaignFilter.set(null);
    this.staleViewsOnly.set(false);
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
    // Only a verified clip has a history to show, so the extra request is only
    // made for one — and only when the dialog is actually opened.
    if (row.status === 'APPROVED' || row.status === 'PAID') {
      void this.loadHistory(row.id);
      return;
    }
    this.history.set([]);
    this.historyState.set('idle');
  }

  protected closePreview(): void {
    this.previewRow.set(null);
    this.history.set([]);
    this.historyState.set('idle');
  }

  protected retryHistory(): void {
    const row = this.previewRow();
    if (row) {
      void this.loadHistory(row.id);
    }
  }

  /** Never fatal: a failed history leaves the screenshot and a retry behind. */
  private async loadHistory(id: string): Promise<void> {
    this.history.set([]);
    this.historyState.set('loading');
    try {
      const checks = await this.admin.viewChecks(id);
      if (this.previewRow()?.id !== id) {
        return;
      }
      this.history.set(checks);
      this.historyState.set('ready');
    } catch {
      if (this.previewRow()?.id !== id) {
        return;
      }
      this.historyState.set('error');
    }
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

  // ------------------------------------------------------- view-check dialog

  /**
   * Re-counting views is only offered on an approved clip: a paid one is frozen
   * and anything earlier goes through the review dialog instead.
   */
  protected canUpdateViews(row: AdminSubmission): boolean {
    return row.status === 'APPROVED';
  }

  protected openViewCheck(row: AdminSubmission): void {
    if (!this.canUpdateViews(row)) {
      return;
    }
    this.viewCheckRow.set(row);
    // Starting from the standing figure makes a small correction a small edit.
    this.newViews.set(row.verifiedViews ?? null);
    this.viewCheckNote.set('');
    this.viewCheckError.set('');
  }

  protected closeViewCheck(): void {
    this.viewCheckRow.set(null);
    this.viewCheckError.set('');
  }

  protected onViewCheckVisibleChange(open: boolean): void {
    if (!open) {
      this.closeViewCheck();
    }
  }

  protected async saveViewCheck(): Promise<void> {
    const row = this.viewCheckRow();
    const views = this.newViews();
    if (!row || this.viewCheckSaving()) {
      return;
    }
    if (views === null || !this.canSaveViewCheck()) {
      this.viewCheckError.set(
        row.campaign.cpm === null
          ? 'This campaign has no CPM, so the payout cannot be recalculated. Add a rate to the campaign first.'
          : 'Enter the new view count before saving.',
      );
      return;
    }

    this.viewCheckSaving.set(true);
    this.viewCheckError.set('');
    try {
      const note = this.viewCheckNote().trim();
      const updated = await this.admin.recordViewCheck(row.id, {
        views,
        ...(note ? { note } : {}),
      });
      this.rows.update((rows) => rows.map((item) => (item.id === row.id ? updated : item)));
      // The preview may be showing this very clip's history, which just grew.
      if (this.previewRow()?.id === row.id) {
        this.previewRow.set(updated);
        void this.loadHistory(row.id);
      }
      this.messages.add({
        severity: 'success',
        summary: 'Views updated',
        detail: `${updated.creator.fullName}'s clip is now at ${formatViews(
          updated.verifiedViews,
        )} verified views.`,
      });
      this.closeViewCheck();
      this.reviewed.emit();
    } catch (error) {
      this.viewCheckError.set(reviewErrorMessage(error));
    } finally {
      this.viewCheckSaving.set(false);
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
        'Views checked',
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
        row.viewsCheckedAt ?? '',
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

/**
 * Contract failures from `PATCH /admin/submissions/:id` and
 * `POST /admin/submissions/:id/view-checks`, in admin language. Both dialogs
 * move the same two fields, so they read the same mapper.
 */
export function reviewErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'We could not update this submission. Please try again.';
  }
  switch (error.code) {
    case 'CAMPAIGN_CPM_MISSING':
      return 'This campaign has no CPM, so a payout cannot be calculated. Add a rate to the campaign first.';
    case 'NOT_APPROVED':
      return 'Approve the clip before marking it paid.';
    case 'SUBMISSION_PAID':
      return 'This clip has already been paid, so its views are frozen. Refresh the table.';
    case 'SUBMISSION_NOT_APPROVED':
      return 'Only an approved clip can have its views re-checked. Approve it first.';
    case 'SUBMISSION_NOT_FOUND':
      return 'This submission no longer exists. Refresh the table.';
    default:
      return error.message;
  }
}
