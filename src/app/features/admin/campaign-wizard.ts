import { Component, computed, effect, inject, input, signal } from '@angular/core';
import {
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ApiError } from '../../core/api/api-error';
import { AdminRepository } from '../../core/data/admin-repository';
import { CampaignDraftInput } from '../../core/models/admin';
import { CampaignPlatform, PublicCampaign } from '../../core/models/campaign';
import { formatDate, formatMoney, platformLabel } from '../../core/util/campaign-format';
import { firstErrorMessage, httpUrlValidator } from '../../shared/forms/form-errors';
import { ImageInput } from '../../shared/forms/image-input';

type WizardState = 'loading' | 'form' | 'published' | 'error';

interface PlatformChoice {
  value: CampaignPlatform;
  label: string;
}

const PLATFORM_CHOICES: PlatformChoice[] = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'x', label: 'X' },
];

const CURRENCY_OPTIONS = [
  { label: '₵ Ghana cedi (GHS)', value: '₵' },
  { label: '$ US dollar (USD)', value: '$' },
];

const CATEGORY_OPTIONS = ['Product', 'Service', 'Event', 'App', 'Music', 'Other'].map((value) => ({
  label: value,
  value,
}));

/**
 * Step definitions drive the header, the per-step validation gate, and the
 * mapping from a `422 INCOMPLETE` field list back to the step that owns it.
 */
const STEPS = [
  {
    title: 'Create new campaign',
    subtitle: 'Give us details about your campaign.',
    fields: ['bannerUrl', 'title'],
  },
  {
    title: 'Campaign details',
    subtitle: 'Enter a description and select a category.',
    fields: ['description', 'category'],
  },
  {
    title: 'Campaign budget',
    subtitle: 'Enter the amount for the campaign and the rate.',
    fields: ['currency', 'budgetTotal', 'cpm'],
  },
  {
    title: 'Campaign timeline',
    subtitle: 'Set the start and end dates.',
    fields: ['startDate', 'endDate'],
  },
  {
    title: 'Campaign platforms',
    subtitle: 'Select the platforms used for this campaign.',
    fields: ['platforms'],
  },
  {
    title: 'Requirements & resources',
    subtitle: 'Content requirements and resources.',
    fields: ['requirementsNote', 'resourceLabel', 'resourceUrl'],
  },
  {
    title: 'Brand details',
    subtitle: 'The company that owns this campaign.',
    fields: ['brandLogoUrl', 'brandName', 'brandLogoBg', 'brandLogoFit'],
  },
  { title: 'Preview', subtitle: 'Check everything before you publish.', fields: [] },
] as const;

const PREVIEW_STEP = STEPS.length - 1;

/** Maps API field names in a `422 INCOMPLETE` response onto our form controls. */
const API_FIELD_TO_CONTROL: Record<string, string> = {
  title: 'title',
  description: 'description',
  category: 'category',
  currency: 'currency',
  cpm: 'cpm',
  budgetTotal: 'budgetTotal',
  startDate: 'startDate',
  endDate: 'endDate',
  platforms: 'platforms',
  bannerUrl: 'bannerUrl',
  brand: 'brandName',
  'brand.name': 'brandName',
  'brand.logoUrl': 'brandLogoUrl',
  requirementsNote: 'requirementsNote',
};

const MESSAGES: Record<string, Record<string, string>> = {
  title: { required: 'Give the campaign a title.' },
  description: { required: 'Describe what clippers need to make.' },
  category: { required: 'Pick a category.' },
  currency: { required: 'Pick a currency.' },
  budgetTotal: {
    required: 'Enter the total campaign budget.',
    min: 'The budget must be more than 0.',
  },
  cpm: { required: 'Enter the rate paid per 1,000 views.', min: 'The rate must be more than 0.' },
  startDate: { required: 'Pick the date the campaign opens.' },
  requirementsNote: { required: 'Tell clippers what the content must include.' },
  resourceUrl: { url: 'Enter a full URL, for example https://drive.google.com/…' },
  brandName: { required: "Enter the brand's company name." },
  brandLogoUrl: { required: 'Add a brand logo.' },
};

/**
 * Campaign creation/editing as a single route with internal step state
 * (`/admin/campaigns/new` and `/admin/campaigns/:slug/edit`).
 *
 * Save draft persists without publishing; Publish saves first, then calls the
 * publish endpoint, and on `422 INCOMPLETE` jumps back to the earliest step
 * that still has a missing field.
 */
@Component({
  imports: [
    ButtonModule,
    CheckboxModule,
    DatePickerModule,
    FormsModule,
    ImageInput,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    ReactiveFormsModule,
    RouterLink,
    SelectModule,
    SkeletonModule,
    TagModule,
    TextareaModule,
  ],
  selector: 'app-campaign-wizard',
  templateUrl: './campaign-wizard.html',
})
export class CampaignWizard {
  /** Present on `/admin/campaigns/:slug/edit`; absent when creating. */
  readonly slug = input<string>();

  private readonly admin = inject(AdminRepository);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  protected readonly steps = STEPS;
  protected readonly previewStep = PREVIEW_STEP;
  protected readonly platformChoices = PLATFORM_CHOICES;
  protected readonly currencyOptions = CURRENCY_OPTIONS;
  protected readonly categoryOptions = CATEGORY_OPTIONS;
  protected readonly logoFitOptions = [
    { label: 'Fill the tile (cover)', value: 'cover' },
    { label: 'Fit inside the tile (contain)', value: 'contain' },
  ];

  protected readonly state = signal<WizardState>('form');
  protected readonly step = signal(0);
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly publishing = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly loadErrorMessage = signal('');
  /** Field names the publish endpoint reported as still missing. */
  protected readonly missingFields = signal<string[]>([]);
  /** Slug of the persisted draft — set after the first save, or in edit mode. */
  protected readonly savedSlug = signal<string | null>(null);

  protected readonly formatDate = formatDate;
  protected readonly formatMoney = formatMoney;
  protected readonly platformLabel = platformLabel;

  protected readonly form = this.formBuilder.group({
    bannerUrl: this.formBuilder.control<string | null>(null),
    title: ['', [Validators.required]],
    description: ['', [Validators.required]],
    category: ['', [Validators.required]],
    currency: ['₵', [Validators.required]],
    budgetTotal: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
    ]),
    cpm: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    startDate: this.formBuilder.control<Date | null>(null, [Validators.required]),
    endDate: this.formBuilder.control<Date | null>(null),
    platforms: this.formBuilder.control<CampaignPlatform[]>([], [Validators.required]),
    requirementsNote: ['', [Validators.required]],
    resourceLabel: [''],
    resourceUrl: ['', [httpUrlValidator]],
    brandName: ['', [Validators.required]],
    brandLogoUrl: this.formBuilder.control<string | null>(null, [Validators.required]),
    brandLogoBg: ['#0B51F0'],
    brandLogoFit: this.formBuilder.control<'cover' | 'contain'>('cover'),
  });

  protected readonly isEditing = computed(() => !!this.slug());
  protected readonly currentStep = computed(() => STEPS[this.step()]);
  protected readonly isPreview = computed(() => this.step() === PREVIEW_STEP);
  protected readonly progressPercent = computed(() => ((this.step() + 1) / STEPS.length) * 100);

  constructor() {
    effect(() => {
      const slug = this.slug();
      if (slug) {
        void this.loadExisting(slug);
      }
    });
  }

  protected fieldError(field: string): string | null {
    const control = this.form.get(field);
    return firstErrorMessage(control, MESSAGES[field] ?? {}, this.submitted());
  }

  protected isPlatformSelected(platform: CampaignPlatform): boolean {
    return this.form.controls.platforms.value.includes(platform);
  }

  protected togglePlatform(platform: CampaignPlatform, selected: boolean): void {
    const current = this.form.controls.platforms.value;
    const next = selected
      ? [...new Set([...current, platform])]
      : current.filter((item) => item !== platform);
    this.form.controls.platforms.setValue(next);
  }

  protected setBanner(url: string | null): void {
    this.form.controls.bannerUrl.setValue(url);
  }

  protected setLogo(url: string | null): void {
    this.form.controls.brandLogoUrl.setValue(url);
    this.form.controls.brandLogoUrl.markAsTouched();
  }

  protected back(): void {
    this.submitted.set(false);
    this.errorMessage.set('');
    this.step.update((step) => Math.max(0, step - 1));
  }

  /** Advances only when the current step's own controls are valid. */
  protected next(): void {
    if (!this.validateStep(this.step())) {
      return;
    }
    this.submitted.set(false);
    this.errorMessage.set('');
    this.step.update((step) => Math.min(PREVIEW_STEP, step + 1));
  }

  protected goToStep(index: number): void {
    this.submitted.set(false);
    this.step.set(index);
  }

  protected async saveDraft(): Promise<void> {
    if (this.saving() || this.publishing()) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    try {
      const campaign = await this.persist();
      this.messages.add({
        severity: 'success',
        summary: 'Draft saved',
        detail: `${campaign.title} is saved as a draft.`,
      });
      await this.router.navigate(['/admin/campaigns']);
    } catch (error) {
      this.errorMessage.set(
        error instanceof ApiError ? error.message : 'We could not save this campaign.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  protected async publish(): Promise<void> {
    if (this.saving() || this.publishing()) {
      return;
    }
    this.publishing.set(true);
    this.errorMessage.set('');
    this.missingFields.set([]);
    try {
      const saved = await this.persist();
      await this.admin.publishCampaign(saved.slug);
      this.state.set('published');
    } catch (error) {
      this.handlePublishError(error);
    } finally {
      this.publishing.set(false);
    }
  }

  /** Creates the draft on first save, then patches it on subsequent saves. */
  private async persist(): Promise<PublicCampaign> {
    const existingSlug = this.savedSlug() ?? this.slug();
    const payload = this.buildPayload();
    const campaign = existingSlug
      ? await this.admin.updateCampaign(existingSlug, payload)
      : await this.admin.createCampaign(payload);
    this.savedSlug.set(campaign.slug);
    return campaign;
  }

  private handlePublishError(error: unknown): void {
    if (!(error instanceof ApiError)) {
      this.errorMessage.set('We could not publish this campaign.');
      return;
    }

    if (error.code === 'INCOMPLETE' || error.status === 422) {
      const missing = this.readMissingFields(error);
      this.missingFields.set(missing);
      this.submitted.set(true);
      this.errorMessage.set(
        missing.length
          ? `This campaign is missing ${missing.join(', ')}. Fill those in, then publish again.`
          : error.message,
      );
      const target = this.earliestStepFor(missing);
      if (target !== null) {
        this.step.set(target);
      }
      return;
    }

    this.errorMessage.set(error.message);
  }

  /** The field list may arrive as structured detail or only inside the message. */
  private readMissingFields(error: ApiError): string[] {
    const detail = error.details['missing'] ?? error.details['fields'];
    if (Array.isArray(detail)) {
      return detail.filter((item): item is string => typeof item === 'string');
    }
    return Object.keys(API_FIELD_TO_CONTROL).filter((field) =>
      new RegExp(`\\b${field.replace('.', '\\.')}\\b`).test(error.message),
    );
  }

  private earliestStepFor(missing: string[]): number | null {
    const controls = missing
      .map((field) => API_FIELD_TO_CONTROL[field])
      .filter((control): control is string => !!control);
    if (controls.length === 0) {
      return null;
    }
    const indexes = STEPS.map((step, index) =>
      step.fields.some((field) => controls.includes(field)) ? index : -1,
    ).filter((index) => index >= 0);
    return indexes.length ? Math.min(...indexes) : null;
  }

  private validateStep(index: number): boolean {
    const step = STEPS[index];
    let valid = true;
    for (const field of step.fields) {
      const control = this.form.get(field);
      if (!control) {
        continue;
      }
      control.markAsTouched();
      control.updateValueAndValidity({ emitEvent: false });
      if (control.invalid) {
        valid = false;
      }
    }
    if (index === 4 && this.form.controls.platforms.value.length === 0) {
      valid = false;
    }
    this.submitted.set(!valid);
    return valid;
  }

  private buildPayload(): CampaignDraftInput {
    const value = this.form.getRawValue();
    return {
      title: value.title.trim(),
      brand: {
        name: value.brandName.trim(),
        logoUrl: value.brandLogoUrl,
        logoBg: value.brandLogoBg || '#0B51F0',
        logoFit: value.brandLogoFit,
      },
      description: value.description.trim(),
      category: value.category,
      currency: value.currency,
      cpm: value.cpm,
      budgetTotal: value.budgetTotal,
      startDate: toIsoDate(value.startDate),
      endDate: toIsoDate(value.endDate),
      platforms: value.platforms,
      bannerUrl: value.bannerUrl,
      requirementsNote: value.requirementsNote.trim() || null,
      resourceLabel: value.resourceLabel.trim() || null,
      resourceUrl: value.resourceUrl.trim() || null,
    };
  }

  private async loadExisting(slug: string): Promise<void> {
    this.state.set('loading');
    try {
      const campaign = await this.admin.campaignBySlug(slug);
      if (!campaign) {
        this.loadErrorMessage.set(`No campaign matches "${slug}".`);
        this.state.set('error');
        return;
      }
      this.savedSlug.set(campaign.slug);
      this.form.patchValue({
        bannerUrl: campaign.bannerUrl,
        title: campaign.title,
        description: campaign.description,
        category: campaign.category,
        currency: campaign.currency,
        budgetTotal: campaign.budgetTotal,
        cpm: campaign.cpm,
        startDate: parseDate(campaign.startDate),
        endDate: parseDate(campaign.endDate),
        platforms: campaign.platforms,
        requirementsNote: campaign.requirementsNote ?? '',
        resourceLabel: campaign.resourceLabel ?? '',
        resourceUrl: campaign.resourceUrl ?? '',
        brandName: campaign.brand.name,
        brandLogoUrl: campaign.brand.logoUrl,
        brandLogoBg: campaign.brand.logoBg,
        brandLogoFit: campaign.brand.logoFit,
      });
      this.state.set('form');
    } catch (error) {
      this.loadErrorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load this campaign.',
      );
      this.state.set('error');
    }
  }
}

/** The API takes ISO dates; the picker gives us local `Date`s. */
function toIsoDate(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
