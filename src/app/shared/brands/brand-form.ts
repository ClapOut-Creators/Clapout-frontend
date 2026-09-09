import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Pencil } from '@primeicons/angular/pencil';
import { Image as ImageIcon } from '@primeicons/angular/image';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { BrandInput } from '../../core/models/brand';
import {
  CITY_OPTIONS,
  COUNTRY_OPTIONS,
  INDUSTRY_OPTIONS,
  Option,
} from '../../core/util/admin-options';
import { firstErrorMessage, httpUrlValidator } from '../forms/form-errors';
import { MAX_IMAGE_BYTES } from '../forms/image-input';

/**
 * The three brand steps (Figma 198:9402, 198:9485, 198:9539). `fields` drives
 * the per-step validation gate, so Continue only advances once the controls
 * that step owns are valid.
 *
 * The Figma subtitles on all three screens are copy-paste leftovers from the
 * campaign wizard ("Give us details about your campaign", "Enter descritpion
 * and select category", "Enter the amount for the campaign and rates"). The
 * project brief asks us to fix copy defects, so they describe the brand here.
 */
export const BRAND_FORM_STEPS = [
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

export const BRAND_FORM_LAST_STEP = BRAND_FORM_STEPS.length - 1;

/** Raw value of the brand form — what {@link BrandForm.patch} accepts. */
export interface BrandFormValue {
  logoUrl: string | null;
  name: string;
  website: string;
  industry: string;
  country: string;
  city: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

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
 * The brand wizard's three steps as one reusable form: admins run it inside
 * `/admin/brands/new` and `/:id/edit`, a brand's own representative runs the
 * identical steps on the public `/brand/onboard/:token` page. Only the shell,
 * the submit target and the success screen differ, so those stay with the
 * hosts; everything about the fields themselves lives here.
 *
 * The host renders the step footer into `<ng-content>` (the admin wizard's
 * Back/Continue pair, the public page's "Save brand"), and the host element
 * itself is `display: contents` so the `<form>` remains a direct flex child of
 * whatever column the host laid out — the markup renders exactly as it did
 * when it was inlined in the wizard.
 */
@Component({
  imports: [ImageIcon, InputTextModule, Pencil, ReactiveFormsModule, SelectModule],
  selector: 'app-brand-form',
  templateUrl: './brand-form.html',
  host: { class: 'contents' },
})
export class BrandForm {
  /** Zero-based index of the step whose fields are rendered. */
  readonly step = input.required<number>();
  /** Mirrors the host's in-flight save onto the form's `aria-busy`. */
  readonly busy = input(false);
  /**
   * Values to seed the form with, patched as soon as the host has them. An
   * input rather than a call so a host that only learns the values while the
   * form is still swapped out for a skeleton never has to wait for a view.
   */
  readonly initialValue = input<Partial<BrandFormValue> | null>(null);
  /**
   * A server-side complaint about the brand name (`409 BRAND_EXISTS`), shown
   * under the field it belongs to rather than as a banner.
   */
  readonly nameErrorMessage = input('');

  /** The host owns what submitting a step means: advance, or save. */
  readonly stepSubmitted = output<void>();

  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly countryOptions = COUNTRY_OPTIONS;
  protected readonly industryOptions = INDUSTRY_OPTIONS;

  readonly form = this.formBuilder.group({
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

  /** True once a step was submitted with errors, so untouched fields report too. */
  readonly submitted = signal(false);
  protected readonly logoErrorMessage = signal('');
  /** The paste-a-URL escape hatch stays collapsed until it is asked for. */
  protected readonly urlEntryOpen = signal(false);
  protected readonly logoUrlDraft = signal('');
  /** Mirrors the country control so the city options can be derived. */
  private readonly selectedCountry = signal('');

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
      const values = this.initialValue();
      if (values) {
        this.patch(values);
      }
    });
  }

  // ------------------------------------------------------------- host API

  /** Seeds the form and treats the result as the new pristine baseline. */
  patch(values: Partial<BrandFormValue>): void {
    this.form.patchValue(values);
    if (values.country !== undefined) {
      this.selectedCountry.set(values.country ?? '');
    }
    if (values.logoUrl !== undefined) {
      const logoUrl = values.logoUrl;
      this.logoUrlDraft.set(logoUrl && !logoUrl.startsWith('data:') ? logoUrl : '');
    }
    this.form.markAsPristine();
  }

  /** The payload both hosts POST, trimmed and with blanks normalised to null. */
  value(): BrandInput {
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

  /** Marks the step's own controls and reports whether it may advance. */
  validateStep(index: number): boolean {
    let valid = true;
    for (const field of BRAND_FORM_STEPS[index].fields) {
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

  /** Going back drops the "submitted" state so the old step stops shouting. */
  clearSubmitted(): void {
    this.submitted.set(false);
  }

  /** A duplicate name belongs to step 1: touch the field the host sends them to. */
  flagNameConflict(): void {
    this.form.controls.name.markAsTouched();
    this.submitted.set(true);
  }

  // ------------------------------------------------------------------ view

  protected fieldError(field: string): string | null {
    return firstErrorMessage(this.form.get(field), MESSAGES[field] ?? {}, this.submitted());
  }

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

  /** A new country invalidates whatever city was picked for the old one. */
  protected onCountryChange(): void {
    this.selectedCountry.set(this.form.controls.country.value);
    this.form.controls.city.setValue('');
    this.form.controls.city.markAsUntouched();
  }
}
