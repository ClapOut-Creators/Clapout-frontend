import { Component, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ArrowRight } from '@primeicons/angular/arrow-right';
import { Check } from '@primeicons/angular/check';
import { Spinner } from '@primeicons/angular/spinner';
import { Times } from '@primeicons/angular/times';
import { ConfirmationService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { ApiError } from '../../core/api/api-error';
import { AdminRepository } from '../../core/data/admin-repository';
import {
  BrandForm,
  BrandFormValue,
  BRAND_FORM_LAST_STEP,
  BRAND_FORM_STEPS,
} from '../../shared/brands/brand-form';
import { WizardShell } from '../../shared/admin/wizard-shell';

type WizardState = 'loading' | 'form' | 'saved' | 'error';

/**
 * Brand creation and editing as one route with internal step state
 * (`/admin/brands/new` and `/admin/brands/:id/edit`), rendered inside the
 * shared full-viewport wizard chrome.
 *
 * The three steps themselves live in `shared/brands/brand-form`, because a
 * brand's own representative fills in exactly the same fields on the public
 * `/brand/onboard/:token` page. This component owns the chrome, the step
 * navigation, the admin submit target and the "Brand Saved!" screen.
 *
 * Creating POSTs on the last step; editing PATCHes the same payload. Either
 * way the wizard swaps to the "Brand Saved!" screen (Figma 198:10001) rather
 * than navigating away, so the saved brand stays one click from here.
 */
@Component({
  imports: [
    ArrowRight,
    BrandForm,
    Check,
    MessageModule,
    RouterLink,
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
  /**
   * `?inquiryId=` from `/admin/inquiries` — prefills the form from a
   * partnership request and marks that request CONVERTED once the brand saves.
   */
  readonly inquiryId = input<string>();

  private readonly admin = inject(AdminRepository);
  private readonly confirmations = inject(ConfirmationService);
  private readonly router = inject(Router);

  /** Absent while the wizard is showing a skeleton, an error or the success screen. */
  private readonly brandForm = viewChild(BrandForm);

  protected readonly steps = BRAND_FORM_STEPS;
  protected readonly lastStep = BRAND_FORM_LAST_STEP;

  protected readonly state = signal<WizardState>('form');
  protected readonly step = signal(0);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly loadErrorMessage = signal('');
  /** Id returned by the API, so the success screen can link to the brand. */
  protected readonly savedBrandId = signal<string | null>(null);
  /** Notice about the inquiry this brand was seeded from, when there was one. */
  protected readonly prefillNotice = signal('');
  /**
   * Values handed to the form once they are known. Held here rather than
   * pushed into the form directly because they usually arrive while the form
   * is still swapped out for the loading skeleton.
   */
  protected readonly prefill = signal<Partial<BrandFormValue> | null>(null);

  protected readonly isEditing = computed(() => !!this.id());
  protected readonly currentStep = computed(() => BRAND_FORM_STEPS[this.step()]);

  constructor() {
    effect(() => {
      const id = this.id();
      if (id) {
        void this.loadExisting(id);
      }
    });

    // Creating from an inquiry: seed the form from what the brand told us.
    effect(() => {
      const inquiryId = this.inquiryId();
      if (inquiryId && !this.id()) {
        void this.prefillFromInquiry(inquiryId);
      }
    });
  }

  // ------------------------------------------------------------ navigation

  protected back(): void {
    this.brandForm()?.clearSubmitted();
    this.errorMessage.set('');
    this.step.update((step) => Math.max(0, step - 1));
  }

  protected onSubmit(): void {
    const form = this.brandForm();
    if (!form || !form.validateStep(this.step())) {
      return;
    }
    if (this.step() < BRAND_FORM_LAST_STEP) {
      form.clearSubmitted();
      this.errorMessage.set('');
      this.step.update((step) => step + 1);
      return;
    }
    void this.save();
  }

  /** Closing discards the draft, so confirm whenever there is work to lose. */
  protected requestClose(): void {
    if (!this.brandForm()?.form.dirty) {
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

  // --------------------------------------------------------------- persist

  private async save(): Promise<void> {
    const form = this.brandForm();
    if (!form || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    try {
      const existingId = this.id();
      const payload = form.value();
      const brand = existingId
        ? await this.admin.updateBrand(existingId, payload)
        : await this.admin.createBrand(payload);
      this.savedBrandId.set(brand.id);
      form.form.markAsPristine();
      this.state.set('saved');
      if (!existingId) {
        await this.convertInquiry(brand.id);
      }
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
      this.brandForm()?.flagNameConflict();
      this.step.set(0);
      return;
    }
    this.errorMessage.set(error.message);
  }

  /**
   * Seeds a new brand from a partnership request. Best effort: a failure here
   * leaves an empty wizard with a notice rather than blocking brand creation.
   */
  private async prefillFromInquiry(inquiryId: string): Promise<void> {
    this.state.set('loading');
    try {
      const inquiry = await this.admin.inquiry(inquiryId);
      this.prefill.set({
        name: inquiry.company?.trim() || inquiry.name,
        website: inquiry.link ?? '',
        contactName: inquiry.name,
        contactEmail: inquiry.email,
        contactPhone: inquiry.phone,
      });
      this.prefillNotice.set(
        `Prefilled from ${inquiry.company?.trim() || inquiry.name}'s partnership request.`,
      );
    } catch {
      this.prefillNotice.set(
        'We could not load that partnership request, so nothing was prefilled.',
      );
    } finally {
      this.state.set('form');
    }
  }

  /**
   * Marks the originating inquiry CONVERTED. Deliberately best effort: the
   * brand exists either way, so a failure here must not take the wizard out of
   * its success state.
   */
  private async convertInquiry(brandId: string): Promise<void> {
    const inquiryId = this.inquiryId();
    if (!inquiryId) {
      return;
    }
    try {
      await this.admin.updateInquiry(inquiryId, { status: 'CONVERTED', brandId });
    } catch {
      this.prefillNotice.set(
        'The brand was created, but we could not mark the partnership request as converted. Update it from Inquiries.',
      );
    }
  }

  private async loadExisting(id: string): Promise<void> {
    this.state.set('loading');
    this.loadErrorMessage.set('');
    try {
      const brand = await this.admin.brand(id);
      this.savedBrandId.set(brand.id);
      this.prefill.set({
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
      this.state.set('form');
    } catch (error) {
      this.loadErrorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load this brand.',
      );
      this.state.set('error');
    }
  }
}
