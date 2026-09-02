import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ArrowRight } from '@primeicons/angular/arrow-right';
import { Pencil } from '@primeicons/angular/pencil';
import { Check } from '@primeicons/angular/check';
import { Image as ImageIcon } from '@primeicons/angular/image';
import { Spinner } from '@primeicons/angular/spinner';
import { Times } from '@primeicons/angular/times';
import { ConfirmationService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { ApiError } from '../../../../core/api/api-error';
import { BrandsRepository } from '../../data-access/brands-repository';
import { BrandInput } from '../../models/brand';
import {
  CITY_OPTIONS,
  COUNTRY_OPTIONS,
  INDUSTRY_OPTIONS,
  Option,
} from '../../../../shared/constants/admin-options';
import { WizardShell } from '../../../../shared/components/wizard-shell';
import { firstErrorMessage, httpUrlValidator } from '../../../../shared/components/form-errors';
import { MAX_IMAGE_BYTES } from '../../components/image-input';

type WizardState = 'loading' | 'form' | 'saved' | 'error';

/**
 * The three wizard steps (Figma 198:9402, 198:9485, 198:9539). `fields` drives
 * the per-step validation gate, so Continue only advances once the controls
 * that step owns are valid.
 *
 * The Figma subtitles on all three screens are copy-paste leftovers from the
 * campaign wizard ("Give us details about your campaign", "Enter descritpion
 * and select category", "Enter the amount for the campaign and rates"). The
 * project brief asks us to fix copy defects, so they describe the brand here.
 */
const STEPS = [
  {
    title: 'Brand Details',
    subtitle: 'Give us details about your brand',
    fields: ['name', 'website', 'industry'],
  },
  {
    title: 'Brand Location',
    subtitle: 'Tell us where this brand is based',
    fields: ['country', 'city'],
  },
  {
    title: 'Primary Contact',
    subtitle: 'Who should we reach about this brand?',
    fields: ['contactName', 'contactEmail', 'contactPhone'],
  },
] as const;

const LAST_STEP = STEPS.length - 1;

const MESSAGES: Record<string, Record<string, string>> = {
  name: { required: 'Enter the brand name.' },
  website: {
    required: 'Add a website or social link for this brand.',
    url: 'Enter a full URL, for example https://example.com',
  },
  industry: { required: 'Pick the industry this brand works in.' },
  country: { required: 'Pick the country this brand is based in.' },
  city: { required: 'Enter the city this brand is based in.' },
  contactName: { required: 'Enter the name of the primary contact.' },
  contactEmail: {
    required: 'Enter a business email address.',
    email: 'Enter a valid email address, for example name@brand.com',
  },
  contactPhone: { required: 'Enter a phone number we can reach them on.' },
};

/**
 * Brand creation and editing as one route with internal step state
 * (`/admin/brands/new` and `/admin/brands/:id/edit`), rendered inside the
 * shared full-viewport wizard chrome.
 *
 * Creating POSTs on the last step; editing PATCHes the same payload. Either
 * way the wizard swaps to the "Brand Saved!" screen (Figma 198:10001) rather
 * than navigating away, so the saved brand stays one click from here.
 */
@Component({
  imports: [
    Pencil,
    ArrowRight,
    Check,
    ImageIcon,
    InputTextModule,
    MessageModule,
    ReactiveFormsModule,
    RouterLink,
    SelectModule,
    SkeletonModule,
    Spinner,
    Times,
    WizardShell,
  ],
  selector: 'app-brand-wizard',
  templateUrl: './brand-wizard.html',
})
export class BrandWizard {
  /** Present on `/admin/brands/:id/edit`; absent when creating. */
  readonly id = input<string>();

  private readonly admin = inject(BrandsRepository);
  private readonly confirmations = inject(ConfirmationService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);

  protected readonly steps = STEPS;
  protected readonly lastStep = LAST_STEP;
  protected readonly countryOptions = COUNTRY_OPTIONS;
  protected readonly industryOptions = INDUSTRY_OPTIONS;

  protected readonly state = signal<WizardState>('form');
  protected readonly step = signal(0);
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly loadErrorMessage = signal('');
  protected readonly logoErrorMessage = signal('');
  /** Id returned by the API, so the success screen can link to the brand. */
  protected readonly savedBrandId = signal<string | null>(null);
  /** The paste-a-URL escape hatch stays collapsed until it is asked for. */
  protected readonly urlEntryOpen = signal(false);
  protected readonly logoUrlDraft = signal('');
  /** Mirrors the country control so the city options can be derived. */
  private readonly selectedCountry = signal('');

  protected readonly form = this.formBuilder.group({
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

  protected readonly isEditing = computed(() => !!this.id());
  protected readonly currentStep = computed(() => STEPS[this.step()]);

  /**
   * Known cities for the chosen country. A country we have no list for falls
   * back to an empty list, and the select stays `editable` throughout, so a
   * city can always be typed regardless.
   */
  protected readonly cityOptions = computed<Option[]>(() =>
    (CITY_OPTIONS[this.selectedCountry()] ?? []).map((value) => ({ label: value, value })),
  );

  constructor() {
    effect(() => {
      const id = this.id();
      if (id) {
        void this.loadExisting(id);
      }
    });
  }

  protected fieldError(field: string): string | null {
    return firstErrorMessage(this.form.get(field), MESSAGES[field] ?? {}, this.submitted());
  }

  // ------------------------------------------------------------------ logo

  protected toggleUrlEntry(): void {
    this.urlEntryOpen.update((open) => !open);
  }

  protected onLogoUrlTyped(event: Event): void {
    const url = (event.target as HTMLInputElement).value.trim();
    this.logoUrlDraft.set(url);
    this.logoErrorMessage.set('');
    this.setLogo(url || null);
  }

  protected clearLogo(): void {
    this.logoUrlDraft.set('');
    this.logoErrorMessage.set('');
    this.setLogo(null);
  }

  /** Small files are inlined as `data:` URLs; anything larger needs a URL. */
  protected onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      const sizeKb = Math.round(file.size / 1024);
      this.logoErrorMessage.set(
        `That image is ${sizeKb} KB. Pick one under 500 KB, or paste an image URL instead.`,
      );
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onerror = () =>
      this.logoErrorMessage.set('We could not read that file. Try another image.');
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) {
        this.logoErrorMessage.set('We could not read that file. Try another image.');
        return;
      }
      this.logoErrorMessage.set('');
      this.logoUrlDraft.set('');
      this.setLogo(result);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  private setLogo(url: string | null): void {
    this.form.controls.logoUrl.setValue(url);
    this.form.controls.logoUrl.markAsDirty();
    this.form.markAsDirty();
  }

  // ------------------------------------------------------------ navigation

  /** A new country invalidates whatever city was picked for the old one. */
  protected onCountryChange(): void {
    this.selectedCountry.set(this.form.controls.country.value);
    this.form.controls.city.setValue('');
    this.form.controls.city.markAsUntouched();
  }

  protected back(): void {
    this.submitted.set(false);
    this.errorMessage.set('');
    this.step.update((step) => Math.max(0, step - 1));
  }

  protected onSubmit(): void {
    if (!this.validateStep(this.step())) {
      return;
    }
    if (this.step() < LAST_STEP) {
      this.submitted.set(false);
      this.errorMessage.set('');
      this.step.update((step) => step + 1);
      return;
    }
    void this.save();
  }

  /** Closing discards the draft, so confirm whenever there is work to lose. */
  protected requestClose(): void {
    if (!this.form.dirty) {
      void this.leave();
      return;
    }
    this.confirmations.confirm({
      header: this.isEditing() ? 'Discard these changes?' : 'Discard this brand?',
      message: 'Nothing has been saved yet. Leaving now discards what you have entered.',
      acceptLabel: 'Discard',
      rejectLabel: 'Keep editing',
      accept: () => void this.leave(),
    });
  }

  private leave(): Promise<boolean> {
    return this.router.navigate(['/admin/brands']);
  }

  private validateStep(index: number): boolean {
    let valid = true;
    for (const field of STEPS[index].fields) {
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
    this.submitted.set(!valid);
    return valid;
  }

  // --------------------------------------------------------------- persist

  private async save(): Promise<void> {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    try {
      const existingId = this.id();
      const payload = this.buildPayload();
      const brand = existingId
        ? await this.admin.updateBrand(existingId, payload)
        : await this.admin.createBrand(payload);
      this.savedBrandId.set(brand.id);
      this.form.markAsPristine();
      this.state.set('saved');
    } catch (error) {
      this.handleSaveError(error);
    } finally {
      this.saving.set(false);
    }
  }

  /** A duplicate name belongs to step 1, so send the admin back to fix it. */
  private handleSaveError(error: unknown): void {
    if (!(error instanceof ApiError)) {
      this.errorMessage.set('We could not save this brand.');
      return;
    }
    if (error.status === 409 || error.code === 'BRAND_EXISTS') {
      this.errorMessage.set('A brand with that name already exists.');
      this.form.controls.name.markAsTouched();
      this.submitted.set(true);
      this.step.set(0);
      return;
    }
    this.errorMessage.set(error.message);
  }

  private buildPayload(): BrandInput {
    const value = this.form.getRawValue();
    return {
      name: value.name.trim(),
      logoUrl: value.logoUrl,
      website: value.website.trim() || null,
      industry: value.industry || null,
      country: value.country || null,
      city: value.city.trim() || null,
      contactName: value.contactName.trim() || null,
      contactEmail: value.contactEmail.trim() || null,
      contactPhone: value.contactPhone.trim() || null,
    };
  }

  private async loadExisting(id: string): Promise<void> {
    this.state.set('loading');
    this.loadErrorMessage.set('');
    try {
      const brand = await this.admin.brand(id);
      this.savedBrandId.set(brand.id);
      this.selectedCountry.set(brand.country ?? '');
      this.logoUrlDraft.set(
        brand.logoUrl && !brand.logoUrl.startsWith('data:') ? brand.logoUrl : '',
      );
      this.form.patchValue({
        logoUrl: brand.logoUrl,
        name: brand.name,
        website: brand.website ?? '',
        industry: brand.industry ?? '',
        country: brand.country ?? '',
        city: brand.city ?? '',
        contactName: brand.contactName ?? '',
        contactEmail: brand.contactEmail ?? '',
        contactPhone: brand.contactPhone ?? '',
      });
      this.form.markAsPristine();
      this.state.set('form');
    } catch (error) {
      this.loadErrorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load this brand.',
      );
      this.state.set('error');
    }
  }
}
