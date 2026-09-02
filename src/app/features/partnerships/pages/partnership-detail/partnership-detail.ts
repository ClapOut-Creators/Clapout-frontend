import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ArrowLeft } from '@primeicons/angular/arrow-left';
import { Copy } from '@primeicons/angular/copy';
import { ExternalLink } from '@primeicons/angular/external-link';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { PageHeader } from '../../../../shared/components/page-header';
import { BrandsRepository } from '../../../brands/data-access/brands-repository';
import { Brand } from '../../../brands/models/brand';
import {
  ConvertPartnershipCommand,
  PARTNERSHIP_STATUS_LABELS,
  PartnershipInquiry,
  PartnershipPriority,
  PartnershipQualification,
  PartnershipStatus,
} from '../../models/partnership';
import { PartnershipsRepository } from '../../data-access/partnerships-repository';

type DetailState = 'loading' | 'ready' | 'not-found' | 'error';

interface Option<T> {
  label: string;
  value: T;
}

const STATUS_OPTIONS: Option<PartnershipStatus>[] = Object.entries(PARTNERSHIP_STATUS_LABELS).map(
  ([value, label]) => ({ label, value: value as PartnershipStatus }),
);

const PRIORITY_OPTIONS: Option<PartnershipPriority>[] = ['LOW', 'MEDIUM', 'HIGH'].map((value) => ({
  label: value[0] + value.slice(1).toLowerCase(),
  value: value as PartnershipPriority,
}));

const QUALIFICATION_OPTIONS: Option<PartnershipQualification>[] = [
  { label: 'Unqualified', value: 'UNQUALIFIED' },
  { label: 'Qualifying', value: 'QUALIFYING' },
  { label: 'Qualified', value: 'QUALIFIED' },
  { label: 'Disqualified', value: 'DISQUALIFIED' },
];

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

function fromDateInput(value: string): string | null {
  return value ? `${value}T09:00:00.000Z` : null;
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Not scheduled';
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

@Component({
  imports: [
    ArrowLeft,
    ButtonModule,
    Copy,
    DatePickerModule,
    DialogModule,
    ExternalLink,
    FormsModule,
    InputTextModule,
    MessageModule,
    PageHeader,
    RouterLink,
    SelectModule,
    TextareaModule,
  ],
  selector: 'app-partnership-detail',
  templateUrl: './partnership-detail.html',
})
export class PartnershipDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repository = inject(PartnershipsRepository);
  private readonly brandsRepository = inject(BrandsRepository);

  protected readonly state = signal<DetailState>('loading');
  protected readonly errorMessage = signal('');
  protected readonly actionMessage = signal('');
  protected readonly inquiry = signal<PartnershipInquiry | null>(null);
  protected readonly owners = signal<Option<string | null>[]>([]);
  protected readonly brands = signal<Brand[]>([]);
  protected readonly converting = signal(false);
  protected readonly conversionOpen = signal(false);
  protected readonly conversionStep = signal(1);
  protected readonly conversionError = signal('');

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly priorityOptions = PRIORITY_OPTIONS;
  protected readonly qualificationOptions = QUALIFICATION_OPTIONS;
  protected readonly conversionModes: Option<'new' | 'existing'>[] = [
    { label: 'Create new brand', value: 'new' },
    { label: 'Attach to existing brand', value: 'existing' },
  ];
  protected readonly draftOptions: Option<boolean>[] = [
    { label: 'Create campaign draft', value: true },
    { label: 'Convert without campaign draft', value: false },
  ];

  protected readonly selectedStatus = signal<PartnershipStatus>('NEW');
  protected readonly selectedOwner = signal<string | null>(null);
  protected readonly followUpDate = signal('');
  protected readonly qualification = signal<PartnershipQualification>('UNQUALIFIED');
  protected readonly priority = signal<PartnershipPriority>('MEDIUM');
  protected readonly internalNotes = signal('');
  protected readonly activityMessage = signal('');
  protected readonly proposalLink = signal('');
  protected readonly closeReason = signal('');

  protected readonly conversionMode = signal<'new' | 'existing'>('new');
  protected readonly existingBrandId = signal<string | null>(null);
  protected readonly brandName = signal('');
  protected readonly brandWebsite = signal('');
  protected readonly brandIndustry = signal('');
  protected readonly brandCountry = signal('Ghana');
  protected readonly brandCity = signal('Accra');
  protected readonly brandContact = signal('');
  protected readonly brandEmail = signal('');
  protected readonly brandPhone = signal('');
  protected readonly createCampaignDraft = signal(true);
  protected readonly campaignTitle = signal('');
  protected readonly assignedManager = signal<string | null>(null);

  protected readonly brandOptions = computed<Option<string>[]>(() =>
    this.brands().map((brand) => ({
      label: `${brand.name} (${brand.website ?? 'no website'})`,
      value: brand.id,
    })),
  );

  constructor() {
    void this.load();
  }

  protected statusLabel(status: PartnershipStatus): string {
    return PARTNERSHIP_STATUS_LABELS[status];
  }

  protected formattedDate(value: string | null): string {
    return formatDate(value);
  }

  protected async saveManagement(): Promise<void> {
    await this.update({
      activityMessage: 'Updated management details.',
      assignedToId: this.selectedOwner(),
      followUpAt: fromDateInput(this.followUpDate()),
      internalNotes: this.internalNotes(),
      priority: this.priority(),
      qualification: this.qualification(),
      status: this.selectedStatus(),
    });
  }

  protected async markStatus(status: PartnershipStatus, message?: string): Promise<void> {
    await this.update({
      activityMessage: message,
      activityType: 'STATUS',
      closedReason:
        status === 'NOT_A_FIT' || status === 'CLOSED'
          ? this.closeReason() || 'Closed by admin.'
          : null,
      status,
    });
  }

  protected async addNote(): Promise<void> {
    const message = this.activityMessage().trim();
    if (!message) {
      return;
    }
    await this.update({ activityMessage: message, activityType: 'NOTE' });
    this.activityMessage.set('');
  }

  protected async logContact(): Promise<void> {
    await this.update({
      activityMessage: this.activityMessage().trim() || 'Logged external contact attempt.',
      activityType: 'CONTACT',
      status: 'AWAITING_FOLLOW_UP',
    });
    this.activityMessage.set('');
  }

  protected async attachProposal(): Promise<void> {
    const link = this.proposalLink().trim();
    if (!link) {
      return;
    }
    await this.update({
      activityMessage: `Proposal linked: ${link}`,
      activityType: 'PROPOSAL',
      status: 'PROPOSAL_SENT',
    });
    this.proposalLink.set('');
  }

  protected openSubmittedLink(): void {
    const url = this.inquiry()?.websiteUrl;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  protected async copy(value: string | null): Promise<void> {
    if (!value) {
      return;
    }
    await navigator.clipboard?.writeText(value);
    this.actionMessage.set('Copied to clipboard.');
  }

  protected async openConversion(): Promise<void> {
    const inquiry = this.inquiry();
    if (!inquiry) {
      return;
    }
    this.conversionOpen.set(true);
    this.conversionStep.set(1);
    this.conversionError.set('');
    this.brandName.set(inquiry.company);
    this.brandWebsite.set(inquiry.websiteUrl ?? '');
    this.brandContact.set(inquiry.contactName);
    this.brandEmail.set(inquiry.email);
    this.brandPhone.set(inquiry.phone ?? '');
    this.campaignTitle.set(inquiry.promoting);
    this.assignedManager.set(inquiry.assignedToId);
    try {
      this.brands.set(await this.brandsRepository.brands(inquiry.company));
    } catch {
      this.brands.set([]);
    }
  }

  protected nextConversionStep(): void {
    this.conversionStep.set(Math.min(4, this.conversionStep() + 1));
  }

  protected previousConversionStep(): void {
    this.conversionStep.set(Math.max(1, this.conversionStep() - 1));
  }

  protected async convert(): Promise<void> {
    const inquiry = this.inquiry();
    if (!inquiry) {
      return;
    }
    this.converting.set(true);
    this.conversionError.set('');
    const command: ConvertPartnershipCommand = {
      assignedManagerId: this.assignedManager(),
      brand: {
        city: this.brandCity() || null,
        contactEmail: this.brandEmail() || null,
        contactName: this.brandContact() || null,
        contactPhone: this.brandPhone() || null,
        country: this.brandCountry() || null,
        industry: this.brandIndustry() || null,
        name: this.brandName(),
        website: this.brandWebsite() || null,
      },
      campaignTitle: this.campaignTitle(),
      createCampaignDraft: this.createCampaignDraft(),
      existingBrandId: this.existingBrandId() ?? undefined,
      mode: this.conversionMode(),
    };
    try {
      const result = await this.repository.convert(inquiry.id, command);
      this.inquiry.set(result.inquiry);
      this.syncForm(result.inquiry);
      this.conversionOpen.set(false);
      this.actionMessage.set(
        result.campaignSlug ? 'Converted with a campaign draft.' : 'Converted to a brand record.',
      );
    } catch (error) {
      this.conversionError.set(error instanceof Error ? error.message : 'Conversion failed.');
    } finally {
      this.converting.set(false);
    }
  }

  protected backToList(): void {
    void this.router.navigate(['/admin/partnerships']);
  }

  private async load(): Promise<void> {
    this.state.set('loading');
    try {
      const [list, inquiry] = await Promise.all([
        this.repository.list(),
        this.repository.get(this.route.snapshot.paramMap.get('inquiryId') ?? ''),
      ]);
      this.owners.set([
        { label: 'Unassigned', value: null },
        ...list.owners.map((owner) => ({ label: owner.name, value: owner.id })),
      ]);
      if (!inquiry) {
        this.state.set('not-found');
        return;
      }
      this.inquiry.set(inquiry);
      this.syncForm(inquiry);
      this.state.set('ready');
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Partnership inquiry could not load.',
      );
      this.state.set('error');
    }
  }

  private syncForm(inquiry: PartnershipInquiry): void {
    this.selectedStatus.set(inquiry.status);
    this.selectedOwner.set(inquiry.assignedToId);
    this.followUpDate.set(toDateInput(inquiry.followUpAt));
    this.qualification.set(inquiry.qualification);
    this.priority.set(inquiry.priority);
    this.internalNotes.set(inquiry.internalNotes);
  }

  private async update(update: Parameters<PartnershipsRepository['update']>[1]): Promise<void> {
    const inquiry = this.inquiry();
    if (!inquiry) {
      return;
    }
    const updated = await this.repository.update(inquiry.id, update);
    this.inquiry.set(updated);
    this.syncForm(updated);
    this.actionMessage.set('Inquiry updated.');
  }
}
