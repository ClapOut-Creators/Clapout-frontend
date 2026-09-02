import { Component, computed, effect, inject, input, signal } from '@angular/core';
import {
  AbstractControl,
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ArrowRight } from '@primeicons/angular/arrow-right';
import { Check } from '@primeicons/angular/check';
import { ExternalLink } from '@primeicons/angular/external-link';
import { Facebook } from '@primeicons/angular/facebook';
import { Image as ImageIcon } from '@primeicons/angular/image';
import { Instagram } from '@primeicons/angular/instagram';
import { Plus } from '@primeicons/angular/plus';
import { Tiktok } from '@primeicons/angular/tiktok';
import { Times } from '@primeicons/angular/times';
import { Twitter } from '@primeicons/angular/twitter';
import { Youtube } from '@primeicons/angular/youtube';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TextareaModule } from 'primeng/textarea';
import { ApiError } from '../../../../core/api/api-error';
import { CampaignsAdminRepository } from '../../data-access/campaigns-admin-repository';
import { BrandsRepository } from '../../../brands/data-access/brands-repository';
import { CampaignDraftInput } from '../../models/campaign-admin';
import { Brand } from '../../../brands/models/brand';
import { CampaignBrand, CampaignPlatform, PublicCampaign } from '../../models/campaign';
import {
  CAMPAIGN_CATEGORY_OPTIONS,
  CAMPAIGN_TAG_OPTIONS,
  CITY_OPTIONS,
  COUNTRY_OPTIONS,
  CURRENCY_OPTIONS,
  estimatedViews,
  INDUSTRY_OPTIONS,
  Option,
} from '../../../../shared/constants/admin-options';
import { formatDate, formatMoney, platformLabel } from '../../../../shared/utils/campaign-format';
import { BrandLogoTile } from '../../../../shared/components/brand-logo-tile';
import { WizardShell } from '../../../../shared/components/wizard-shell';
import { firstErrorMessage, httpUrlValidator } from '../../../../shared/components/form-errors';
import { ShareCampaignButton } from '../../components/share-campaign-button';

type WizardState = 'loading' | 'form' | 'published' | 'error';

/** Banner/logo artwork travels inside the JSON body, so keep uploads small. */
const MAX_IMAGE_BYTES = 500 * 1024;

/** Both long-form fields show a `0/3000` counter in the design (172:1211). */
const LONG_TEXT_LIMIT = 3000;

interface PlatformChoice {
  value: CampaignPlatform;
  label: string;
  /** Brand tile background lifted from 172:3073 (TikTok #010101, FB #1976D2, …). */
  tileClass: string;
}

const PLATFORM_CHOICES: PlatformChoice[] = [
  { value: 'tiktok', label: 'TikTok', tileClass: 'bg-[#010101]' },
  {
    value: 'instagram',
    label: 'Instagram',
    tileClass: 'bg-[linear-gradient(45deg,#F9CE34,#EE2A7B,#6228D7)]',
  },
  { value: 'facebook', label: 'Facebook', tileClass: 'bg-[#1976D2]' },
  { value: 'youtube', label: 'YouTube Reel', tileClass: 'bg-[#E60000]' },
  { value: 'x', label: 'X', tileClass: 'bg-[#010101]' },
];

/**
 * Step definitions drive the shell's title/subtitle and progress, the per-step
 * validation gate, and the mapping from a `422 INCOMPLETE` field list back to
 * the step that owns it.
 *
 * Index 0 is the brand picker: a campaign's identity now comes from the Brand
 * record, so the old inline "Brand details" step is gone.
 */
const STEPS = [
  {
    title: 'Select Brand',
    subtitle: 'Choose the brand this campaign belongs to.',
    fields: ['brandId'],
  },
  {
    title: 'Create New Campaign',
    subtitle: 'Give us details about your campaign',
    fields: ['bannerUrl', 'title'],
  },
  {
    title: 'Campaign Details',
    subtitle: 'Enter a description and select a category',
    fields: ['description', 'category', 'tag'],
  },
  {
    title: 'Campaign Budget',
    subtitle: 'Enter the amount for the campaign and rates',
    fields: ['currency', 'budgetTotal', 'cpm'],
  },
  {
    title: 'Campaign Timeline',
    subtitle: 'Set the start date and end date',
    fields: ['dateRange'],
  },
  {
    title: 'Campaign Platforms',
    subtitle: 'Select the platforms (more than 1) used for the campaign',
    fields: ['platforms'],
  },
  {
    title: 'Requirement & Resources',
    subtitle: 'Content requirement and resources',
    fields: ['requirementsNote', 'resourceLabel', 'resourceUrl'],
  },
  { title: 'Campaign - Detail', subtitle: '', fields: [] },
] as const;

const PREVIEW_STEP = STEPS.length - 1;

/**
 * The inline "create a brand" sub-flow. Same three steps, fields and labels as
 * the standalone brand wizard (198:9402 / 198:9485 / 198:9539), rendered inside
 * this modal so the admin never loses the half-filled campaign.
 */
const BRAND_STEPS = [
  {
    title: 'Brand Details',
    subtitle: 'Give us details about the brand',
    fields: ['logoUrl', 'name', 'website', 'industry'],
  },
  {
    title: 'Brand Location',
    subtitle: 'Tell us where the brand is based',
    fields: ['country', 'city'],
  },
  {
    title: 'Primary Contact',
    subtitle: 'Who should we talk to about this brand?',
    fields: ['contactName', 'contactEmail', 'contactPhone'],
  },
] as const;

/** Maps API field names in a `422 INCOMPLETE` response onto our form controls. */
const API_FIELD_TO_CONTROL: Record<string, string> = {
  brand: 'brandId',
  brandId: 'brandId',
  title: 'title',
  bannerUrl: 'bannerUrl',
  description: 'description',
  category: 'category',
  tags: 'tag',
  currency: 'currency',
  cpm: 'cpm',
  budgetTotal: 'budgetTotal',
  startDate: 'dateRange',
  endDate: 'dateRange',
  platforms: 'platforms',
  requirementsNote: 'requirementsNote',
};

const MESSAGES: Record<string, Record<string, string>> = {
  brandId: { required: 'Pick the brand that owns this campaign.' },
  title: { required: 'Give the campaign a title.' },
  description: {
    required: 'Describe what clippers need to make.',
    maxlength: 'Keep the description under 3,000 characters.',
  },
  category: { required: 'Pick a category.' },
  tag: { required: 'Pick what this campaign promotes.' },
  currency: { required: 'Pick a currency.' },
  budgetTotal: {
    required: 'Enter the total campaign budget.',
    min: 'The budget must be more than 0.',
  },
  cpm: { required: 'Enter the rate paid per 1,000 views.', min: 'The rate must be more than 0.' },
  dateRange: { required: 'Pick the date the campaign opens.' },
  platforms: { required: 'Select at least one platform.' },
  requirementsNote: {
    required: 'Tell clippers what the content must include.',
    maxlength: 'Keep the requirement under 3,000 characters.',
  },
  resourceUrl: { url: 'Enter a full URL, for example https://drive.google.com/…' },
};

const BRAND_MESSAGES: Record<string, Record<string, string>> = {
  name: { required: "Enter the brand's name." },
  website: {
    required: 'Add the website or social link.',
    url: 'Enter a full URL, for example https://e-wale.com',
  },
  industry: { required: 'Pick an industry.' },
  country: { required: 'Pick a country.' },
  city: { required: 'Enter the city.' },
  contactName: { required: 'Enter the primary contact.' },
  contactEmail: { required: 'Enter a business email.', email: 'Enter a valid email address.' },
  contactPhone: { required: 'Enter a phone number.' },
};

/**
 * The range picker holds `[start, end]`; only the start date is required, so a
 * single-date selection means "opens then, no announced end".
 */
function dateRangeStartValidator(control: AbstractControl): ValidationErrors | null {
  const range = control.value as (Date | null)[] | null;
  return range && range[0] instanceof Date ? null : { required: true };
}

/**
 * Campaign creation/editing as a single route with internal step state
 * (`/admin/campaigns/new`, `/admin/campaigns/new?brandId=…` and
 * `/admin/campaigns/:slug/edit`).
 *
 * Save draft persists without publishing; Publish saves first, then calls the
 * publish endpoint, and on `422 INCOMPLETE` jumps back to the earliest step
 * that still has a missing field.
 */
@Component({
  imports: [
    ArrowRight,
    BrandLogoTile,
    Check,
    CheckboxModule,
    DatePickerModule,
    ExternalLink,
    Facebook,
    FormsModule,
    ImageIcon,
    InputNumberModule,
    InputTextModule,
    Instagram,
    MessageModule,
    Plus,
    ReactiveFormsModule,
    RouterLink,
    SelectModule,
    ShareCampaignButton,
    SkeletonModule,
    TextareaModule,
    Tiktok,
    Times,
    Twitter,
    WizardShell,
    Youtube,
  ],
  selector: 'app-campaign-wizard',
  templateUrl: './campaign-wizard.html',
})
export class CampaignWizard {
  /** Present on `/admin/campaigns/:slug/edit`; absent when creating. */
  readonly slug = input<string>();
  /** `?brandId=` preselects the owning brand (e.g. from a brand detail page). */
  readonly brandId = input<string>();

  private readonly campaignsAdmin = inject(CampaignsAdminRepository);
  private readonly brandsAdmin = inject(BrandsRepository);
  private readonly confirmations = inject(ConfirmationService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  protected readonly steps = STEPS;
  protected readonly brandSteps = BRAND_STEPS;
  protected readonly longTextLimit = LONG_TEXT_LIMIT;
  protected readonly platformChoices = PLATFORM_CHOICES;
  protected readonly currencyOptions = CURRENCY_OPTIONS;
  protected readonly categoryOptions = CAMPAIGN_CATEGORY_OPTIONS;
  protected readonly tagOptions = CAMPAIGN_TAG_OPTIONS;
  protected readonly industryOptions = INDUSTRY_OPTIONS;
  protected readonly countryOptions = COUNTRY_OPTIONS;

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
  /** The draft loaded in edit mode; supplies brand artwork and `updatedAt`. */
  protected readonly loadedCampaign = signal<PublicCampaign | null>(null);

  protected readonly brands = signal<Brand[]>([]);
  protected readonly brandsLoading = signal(false);
  protected readonly brandsErrorMessage = signal('');

  /** -1 while the inline brand sub-flow is closed; 0-2 while it runs. */
  protected readonly brandStep = signal(-1);
  protected readonly brandSubmitted = signal(false);
  protected readonly brandSaving = signal(false);
  protected readonly brandErrorMessage = signal('');
  /** Drives the City select, which only has options for a few countries. */
  protected readonly brandCountry = signal('');

  protected readonly bannerErrorMessage = signal('');
  /** The "or paste an image URL" escape hatch stays collapsed until asked for. */
  protected readonly bannerUrlOpen = signal(false);
  protected readonly logoErrorMessage = signal('');
  protected readonly logoUrlOpen = signal(false);

  protected readonly formatDate = formatDate;
  protected readonly formatMoney = formatMoney;
  protected readonly platformLabel = platformLabel;

  protected readonly form = this.formBuilder.group({
    brandId: ['', [Validators.required]],
    bannerUrl: this.formBuilder.control<string | null>(null),
    title: ['', [Validators.required]],
    description: ['', [Validators.required, Validators.maxLength(LONG_TEXT_LIMIT)]],
    category: ['', [Validators.required]],
    // The design's "Product" field is not in the campaign contract; it maps onto
    // `tags`, stored as a single-element array (see `buildPayload`).
    tag: ['', [Validators.required]],
    currency: ['₵', [Validators.required]],
    budgetTotal: this.formBuilder.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
    ]),
    cpm: this.formBuilder.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    // PrimeNG's range picker writes `[start, end]`; the end stays null until picked.
    dateRange: this.formBuilder.control<(Date | null)[] | null>(null, [dateRangeStartValidator]),
    platforms: this.formBuilder.control<CampaignPlatform[]>([], [Validators.required]),
    requirementsNote: ['', [Validators.required, Validators.maxLength(LONG_TEXT_LIMIT)]],
    resourceLabel: [''],
    resourceUrl: ['', [httpUrlValidator]],
  });

  /** Mirrors the standalone brand wizard's fields so both produce the same record. */
  protected readonly brandForm = this.formBuilder.group({
    logoUrl: this.formBuilder.control<string | null>(null),
    name: ['', [Validators.required]],
    website: ['', [Validators.required, httpUrlValidator]],
    industry: ['', [Validators.required]],
    country: ['', [Validators.required]],
    city: ['', [Validators.required]],
    contactName: ['', [Validators.required]],
    contactEmail: ['', [Validators.required, Validators.email]],
    contactPhone: ['', [Validators.required]],
  });

  protected readonly isEditing = computed(() => !!this.slug());
  protected readonly currentStep = computed(() => STEPS[this.step()]);
  protected readonly isPreview = computed(() => this.step() === PREVIEW_STEP);
  protected readonly inBrandFlow = computed(() => this.brandStep() >= 0);
  protected readonly currentBrandStep = computed(() => BRAND_STEPS[Math.max(0, this.brandStep())]);

  /** City is a select where we know the country's cities, a text field otherwise. */
  protected readonly cityOptions = computed<Option[]>(() =>
    (CITY_OPTIONS[this.brandCountry()] ?? []).map((value) => ({ label: value, value })),
  );

  constructor() {
    effect(() => {
      const slug = this.slug();
      if (slug) {
        void this.loadExisting(slug);
      }
    });

    effect(() => {
      const brandId = this.brandId();
      if (brandId && !this.form.controls.brandId.value) {
        this.form.controls.brandId.setValue(brandId);
      }
    });

    void this.loadBrands();
  }

  // ------------------------------------------------------------- validation

  protected fieldError(field: string): string | null {
    return firstErrorMessage(this.form.get(field), MESSAGES[field] ?? {}, this.submitted());
  }

  protected brandFieldError(field: string): string | null {
    return firstErrorMessage(
      this.brandForm.get(field),
      BRAND_MESSAGES[field] ?? {},
      this.brandSubmitted(),
    );
  }

  // ------------------------------------------------------------ step fields

  protected isPlatformSelected(platform: CampaignPlatform): boolean {
    return this.form.controls.platforms.value.includes(platform);
  }

  protected togglePlatform(platform: CampaignPlatform, selected: boolean): void {
    const current = this.form.controls.platforms.value;
    const next = selected
      ? [...new Set([...current, platform])]
      : current.filter((item) => item !== platform);
    this.form.controls.platforms.setValue(next);
    this.form.controls.platforms.markAsDirty();
  }

  /** Budget ÷ rate × 1,000 — the design's "Views" input, rendered read-only. */
  protected estimatedViewsLabel(): string {
    const views = estimatedViews(
      this.form.controls.budgetTotal.value,
      this.form.controls.cpm.value,
    );
    return views === null ? '—' : views.toLocaleString('en-GB');
  }

  protected rangeStartLabel(): string {
    const start = this.form.controls.dateRange.value?.[0];
    return start ? formatDate(start.toISOString()) : '—';
  }

  protected rangeEndLabel(): string {
    const end = this.form.controls.dateRange.value?.[1];
    return end ? formatDate(end.toISOString()) : '—';
  }

  protected rangeLabel(): string {
    const range = this.form.controls.dateRange.value;
    if (!range?.[0]) {
      return 'Pick a start date, then an end date.';
    }
    return range[1]
      ? `${this.rangeStartLabel()} – ${this.rangeEndLabel()}`
      : `${this.rangeStartLabel()} – no end date announced`;
  }

  /** Never dump a huge `data:` URL into the visible "paste a URL" field. */
  protected imageUrlDraft(value: string | null): string {
    return value && !value.startsWith('data:') ? value : '';
  }

  protected onBannerFile(event: Event): void {
    this.readImage(
      event,
      (url) => {
        this.bannerErrorMessage.set('');
        this.form.controls.bannerUrl.setValue(url);
        this.form.controls.bannerUrl.markAsDirty();
      },
      this.bannerErrorMessage,
    );
  }

  protected setBannerUrl(url: string): void {
    this.bannerErrorMessage.set('');
    this.form.controls.bannerUrl.setValue(url.trim() ? url.trim() : null);
    this.form.controls.bannerUrl.markAsDirty();
  }

  protected clearBanner(): void {
    this.bannerErrorMessage.set('');
    this.form.controls.bannerUrl.setValue(null);
    this.form.controls.bannerUrl.markAsDirty();
  }

  protected onLogoFile(event: Event): void {
    this.readImage(
      event,
      (url) => {
        this.logoErrorMessage.set('');
        this.brandForm.controls.logoUrl.setValue(url);
        this.brandForm.controls.logoUrl.markAsDirty();
      },
      this.logoErrorMessage,
    );
  }

  protected setLogoUrl(url: string): void {
    this.logoErrorMessage.set('');
    this.brandForm.controls.logoUrl.setValue(url.trim() ? url.trim() : null);
    this.brandForm.controls.logoUrl.markAsDirty();
  }

  private readImage(
    event: Event,
    apply: (url: string) => void,
    errorMessage: { set(value: string): void },
  ): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      errorMessage.set(
        `That image is ${Math.round(file.size / 1024)} KB. Pick one under 500 KB, or paste a URL.`,
      );
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => errorMessage.set('We could not read that file. Try another image.');
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        apply(reader.result);
      } else {
        errorMessage.set('We could not read that file. Try another image.');
      }
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  // ----------------------------------------------------------- brand picker

  private async loadBrands(): Promise<void> {
    this.brandsLoading.set(true);
    this.brandsErrorMessage.set('');
    try {
      this.brands.set(await this.brandsAdmin.brands());
    } catch (error) {
      this.brandsErrorMessage.set(
        error instanceof ApiError
          ? error.message
          : 'We could not load your brands. You can still create a new one.',
      );
    } finally {
      this.brandsLoading.set(false);
    }
  }

  protected selectedBrand(): Brand | null {
    const id = this.form.controls.brandId.value;
    return this.brands().find((brand) => brand.id === id) ?? null;
  }

  /** Brand artwork for the preview: the picked brand, or the loaded draft's. */
  protected previewBrand(): CampaignBrand | null {
    const brand = this.selectedBrand();
    if (brand) {
      return {
        name: brand.name,
        logoUrl: brand.logoUrl,
        logoBg: brand.logoBg,
        logoFit: brand.logoFit,
      };
    }
    return this.loadedCampaign()?.brand ?? null;
  }

  // -------------------------------------------------------- brand sub-flow

  protected startBrandFlow(): void {
    this.brandErrorMessage.set('');
    this.brandSubmitted.set(false);
    this.brandStep.set(0);
  }

  protected brandBack(): void {
    this.brandSubmitted.set(false);
    this.brandErrorMessage.set('');
    // Backing out of the first sub-step returns to the campaign's brand picker.
    this.brandStep.update((index) => index - 1);
  }

  protected async brandNext(): Promise<void> {
    const index = this.brandStep();
    if (!this.validateGroup(this.brandForm, BRAND_STEPS[index].fields, this.brandSubmitted)) {
      return;
    }
    this.brandSubmitted.set(false);
    this.brandErrorMessage.set('');
    if (index < BRAND_STEPS.length - 1) {
      this.brandStep.set(index + 1);
      return;
    }
    await this.createBrand();
  }

  /** Posts the brand, then hands the campaign flow back with it preselected. */
  private async createBrand(): Promise<void> {
    if (this.brandSaving()) {
      return;
    }
    this.brandSaving.set(true);
    try {
      const value = this.brandForm.getRawValue();
      const brand = await this.brandsAdmin.createBrand({
        name: value.name.trim(),
        logoUrl: value.logoUrl,
        logoBg: '#0B51F0',
        logoFit: 'cover',
        website: value.website.trim() || null,
        industry: value.industry || null,
        country: value.country || null,
        city: value.city.trim() || null,
        contactName: value.contactName.trim() || null,
        contactEmail: value.contactEmail.trim() || null,
        contactPhone: value.contactPhone.trim() || null,
      });
      this.brands.update((brands) =>
        [...brands.filter((item) => item.id !== brand.id), brand].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      this.form.controls.brandId.setValue(brand.id);
      this.form.controls.brandId.markAsDirty();
      this.brandForm.reset();
      this.brandCountry.set('');
      this.brandStep.set(-1);
      this.step.set(0);
      this.messages.add({
        severity: 'success',
        summary: 'Brand created',
        detail: `${brand.name} is ready to use.`,
      });
    } catch (error) {
      this.brandErrorMessage.set(
        error instanceof ApiError ? error.message : 'We could not create this brand.',
      );
    } finally {
      this.brandSaving.set(false);
    }
  }

  protected onCountryChange(country: string): void {
    this.brandCountry.set(country);
    this.brandForm.controls.city.setValue('');
  }

  // ------------------------------------------------------------ navigation

  protected back(): void {
    this.submitted.set(false);
    this.errorMessage.set('');
    this.step.update((step) => Math.max(0, step - 1));
  }

  /** Advances only when the current step's own controls are valid. */
  protected next(): void {
    if (!this.validateGroup(this.form, STEPS[this.step()].fields, this.submitted)) {
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

  /** ✕ leaves for the campaign list, confirming first when there is unsaved work. */
  protected requestClose(): void {
    if (!this.form.dirty && !this.brandForm.dirty) {
      void this.router.navigate(['/admin/campaigns']);
      return;
    }
    this.confirmations.confirm({
      header: 'Leave without saving?',
      message: 'The details you have entered for this campaign will be lost.',
      acceptLabel: 'Discard changes',
      rejectLabel: 'Keep editing',
      accept: () => void this.router.navigate(['/admin/campaigns']),
    });
  }

  // -------------------------------------------------------------- persisting

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
      await this.campaignsAdmin.publishCampaign(saved.slug);
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
      ? await this.campaignsAdmin.updateCampaign(existingSlug, payload)
      : await this.campaignsAdmin.createCampaign(payload);
    this.savedSlug.set(campaign.slug);
    this.loadedCampaign.set(campaign);
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

  private validateGroup(
    group: AbstractControl,
    fields: readonly string[],
    submitted: { set(value: boolean): void },
  ): boolean {
    let valid = true;
    for (const field of fields) {
      const control = group.get(field);
      if (!control) {
        continue;
      }
      control.markAsTouched();
      control.updateValueAndValidity({ emitEvent: false });
      if (control.invalid) {
        valid = false;
      }
    }
    submitted.set(!valid);
    return valid;
  }

  private buildPayload(): CampaignDraftInput {
    const value = this.form.getRawValue();
    const range = value.dateRange ?? [];
    return {
      title: value.title.trim(),
      brandId: value.brandId,
      description: value.description.trim(),
      category: value.category,
      currency: value.currency,
      cpm: value.cpm,
      budgetTotal: value.budgetTotal,
      startDate: toIsoDate(range[0] ?? null),
      endDate: toIsoDate(range[1] ?? null),
      platforms: value.platforms,
      // "Product" in the design is the campaign's single tag.
      tags: value.tag ? [value.tag] : [],
      bannerUrl: value.bannerUrl,
      requirementsNote: value.requirementsNote.trim() || null,
      resourceLabel: value.resourceLabel.trim() || null,
      resourceUrl: value.resourceUrl.trim() || null,
    };
  }

  private async loadExisting(slug: string): Promise<void> {
    this.state.set('loading');
    try {
      const campaign = await this.campaignsAdmin.campaignBySlug(slug);
      if (!campaign) {
        this.loadErrorMessage.set(`No campaign matches "${slug}".`);
        this.state.set('error');
        return;
      }
      this.savedSlug.set(campaign.slug);
      this.loadedCampaign.set(campaign);
      const start = parseDate(campaign.startDate);
      const end = parseDate(campaign.endDate);
      this.form.patchValue({
        brandId: campaign.brandId,
        bannerUrl: campaign.bannerUrl,
        title: campaign.title,
        description: campaign.description,
        category: campaign.category,
        tag: campaign.tags[0] ?? '',
        currency: campaign.currency,
        budgetTotal: campaign.budgetTotal,
        cpm: campaign.cpm,
        dateRange: start ? [start, end] : null,
        platforms: campaign.platforms,
        requirementsNote: campaign.requirementsNote ?? '',
        resourceLabel: campaign.resourceLabel ?? '',
        resourceUrl: campaign.resourceUrl ?? '',
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
