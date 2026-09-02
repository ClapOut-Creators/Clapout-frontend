import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Search } from '@primeicons/angular/search';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { PageHeader } from '../../../../shared/components/page-header';
import { StatCard } from '../../../../shared/components/stat-card';
import {
  PARTNERSHIP_STATUS_LABELS,
  PartnershipBudgetRange,
  PartnershipContentType,
  PartnershipInquiry,
  PartnershipListResult,
  PartnershipStatus,
  PartnershipTimeline,
} from '../../models/partnership';
import { PartnershipsRepository } from '../../data-access/partnerships-repository';

type PageState = 'loading' | 'ready' | 'error';

interface Option<T> {
  label: string;
  value: T;
}

const STATUS_OPTIONS: Option<PartnershipStatus | 'ALL'>[] = [
  { label: 'All statuses', value: 'ALL' },
  ...Object.entries(PARTNERSHIP_STATUS_LABELS).map(([value, label]) => ({
    label,
    value: value as PartnershipStatus,
  })),
];

const BUDGET_OPTIONS: Option<PartnershipBudgetRange | 'ALL'>[] = [
  'Under GHS 5k',
  'GHS 5k-15k',
  'GHS 15k-50k',
  'GHS 50k+',
].map((value) => ({ label: value, value: value as PartnershipBudgetRange }));
BUDGET_OPTIONS.unshift({ label: 'All budgets', value: 'ALL' });

const CONTENT_OPTIONS: Option<PartnershipContentType | 'ALL'>[] = [
  'Product',
  'Service',
  'Artist',
  'Campaign',
  'Event',
  'App',
].map((value) => ({ label: value, value: value as PartnershipContentType }));
CONTENT_OPTIONS.unshift({ label: 'All content', value: 'ALL' });

const TIMELINE_OPTIONS: Option<PartnershipTimeline | 'ALL'>[] = [
  'This month',
  'Next 30 days',
  'This quarter',
  'Flexible',
].map((value) => ({ label: value, value: value as PartnershipTimeline }));
TIMELINE_OPTIONS.unshift({ label: 'All timelines', value: 'ALL' });

function formatDate(value: string | null): string {
  if (!value) {
    return 'No date set';
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

@Component({
  imports: [
    ButtonModule,
    CheckboxModule,
    FormsModule,
    InputTextModule,
    MessageModule,
    PageHeader,
    RouterLink,
    Search,
    SelectModule,
    SkeletonModule,
    StatCard,
    TableModule,
  ],
  selector: 'app-partnerships-overview',
  templateUrl: './partnerships-overview.html',
})
export class PartnershipsOverview {
  private readonly repository = inject(PartnershipsRepository);

  protected readonly state = signal<PageState>('loading');
  protected readonly errorMessage = signal('');
  protected readonly result = signal<PartnershipListResult | null>(null);
  protected readonly search = signal('');
  protected readonly status = signal<PartnershipStatus | 'ALL'>('ALL');
  protected readonly ownerId = signal<string | 'ALL' | 'UNASSIGNED'>('ALL');
  protected readonly budgetRange = signal<PartnershipBudgetRange | 'ALL'>('ALL');
  protected readonly contentType = signal<PartnershipContentType | 'ALL'>('ALL');
  protected readonly timeline = signal<PartnershipTimeline | 'ALL'>('ALL');
  protected readonly overdueOnly = signal(false);
  protected readonly unassignedOnly = signal(false);

  protected readonly statuses = STATUS_OPTIONS;
  protected readonly budgets = BUDGET_OPTIONS;
  protected readonly contentTypes = CONTENT_OPTIONS;
  protected readonly timelines = TIMELINE_OPTIONS;
  protected readonly skeletonRows = Array.from({ length: 5 });

  protected readonly ownerOptions = computed<Option<string | 'ALL' | 'UNASSIGNED'>[]>(() => [
    { label: 'All owners', value: 'ALL' },
    { label: 'Unassigned', value: 'UNASSIGNED' },
    ...(this.result()?.owners ?? []).map((owner) => ({ label: owner.name, value: owner.id })),
  ]);

  protected readonly inquiries = computed(() => this.result()?.inquiries ?? []);
  protected readonly summary = computed(
    () =>
      this.result()?.summary ?? {
        awaitingFollowUp: 0,
        convertedPartnerships: 0,
        newInquiries: 0,
        overdueFollowUps: 0,
        qualifiedOpportunities: 0,
      },
  );
  protected readonly hasFilters = computed(
    () =>
      this.search().trim().length > 0 ||
      this.status() !== 'ALL' ||
      this.ownerId() !== 'ALL' ||
      this.budgetRange() !== 'ALL' ||
      this.contentType() !== 'ALL' ||
      this.timeline() !== 'ALL' ||
      this.overdueOnly() ||
      this.unassignedOnly(),
  );

  constructor() {
    void this.load();
  }

  protected async applyFilters(): Promise<void> {
    await this.load();
  }

  protected async clearFilters(): Promise<void> {
    this.search.set('');
    this.status.set('ALL');
    this.ownerId.set('ALL');
    this.budgetRange.set('ALL');
    this.contentType.set('ALL');
    this.timeline.set('ALL');
    this.overdueOnly.set(false);
    this.unassignedOnly.set(false);
    await this.load();
  }

  protected statusLabel(status: PartnershipStatus): string {
    return PARTNERSHIP_STATUS_LABELS[status];
  }

  protected statusClass(status: PartnershipStatus): string {
    if (status === 'CONVERTED' || status === 'QUALIFIED') {
      return 'bg-emerald-50 text-emerald-700';
    }
    if (
      status === 'NOT_A_FIT' ||
      status === 'SPAM' ||
      status === 'DUPLICATE' ||
      status === 'CLOSED'
    ) {
      return 'bg-surface-100 text-surface-600';
    }
    if (status === 'AWAITING_FOLLOW_UP' || status === 'PROPOSAL_SENT' || status === 'NEGOTIATING') {
      return 'bg-amber-50 text-amber-700';
    }
    return 'bg-orange-50 text-orange-700';
  }

  protected nextAction(inquiry: PartnershipInquiry): string {
    if (inquiry.status === 'NEW') {
      return 'Review inquiry';
    }
    if (inquiry.status === 'QUALIFIED') {
      return 'Prepare proposal';
    }
    if (inquiry.status === 'CONVERTED') {
      return 'Converted';
    }
    return formatDate(inquiry.followUpAt);
  }

  protected submitted(value: string): string {
    return formatDate(value);
  }

  private async load(): Promise<void> {
    this.state.set('loading');
    try {
      this.result.set(
        await this.repository.list({
          budgetRange: this.budgetRange(),
          contentType: this.contentType(),
          overdueOnly: this.overdueOnly(),
          ownerId: this.ownerId(),
          search: this.search(),
          status: this.status(),
          timeline: this.timeline(),
          unassignedOnly: this.unassignedOnly(),
        }),
      );
      this.errorMessage.set('');
      this.state.set('ready');
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Partnership requests could not load.',
      );
      this.state.set('error');
    }
  }
}
