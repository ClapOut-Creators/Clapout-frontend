import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TextareaModule } from 'primeng/textarea';
import { ApiError } from '../../core/api/api-error';
import { CampaignsRepository } from '../../core/data/campaigns-repository';
import { RegistrationsRepository } from '../../core/data/registrations-repository';
import { CampaignPlatform, PublicCampaign } from '../../core/models/campaign';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  openCountdownLabel,
  platformLabel,
} from '../../core/util/campaign-format';
import { createNowSignal } from '../../shared/time/clock';
import { firstErrorMessage, httpUrlValidator } from '../../shared/forms/form-errors';

type ApplyState = 'loading' | 'ready' | 'not-found' | 'error';

const MESSAGES: Record<string, Record<string, string>> = {
  platform: { required: 'Choose the platform you will clip on.' },
  accountUrl: {
    required: 'Add the link to the account you will post from.',
    url: 'Enter a full URL, for example https://www.tiktok.com/@yourname.',
  },
  terms: { required: 'You need to accept the campaign terms to apply.' },
};

/** Guarded campaign application form (`POST /registrations`). */
@Component({
  imports: [
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    MessageModule,
    ReactiveFormsModule,
    RouterLink,
    SelectModule,
    SkeletonModule,
    TextareaModule,
  ],
  selector: 'app-campaign-apply',
  templateUrl: './campaign-apply.html',
})
export class CampaignApply {
  /** Bound from the `:slug` route parameter via `withComponentInputBinding()`. */
  readonly slug = input.required<string>();

  private readonly campaignsRepository = inject(CampaignsRepository);
  private readonly registrations = inject(RegistrationsRepository);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  protected readonly state = signal<ApplyState>('loading');
  protected readonly campaign = signal<PublicCampaign | null>(null);
  protected readonly loadErrorMessage = signal<string>('');
  protected readonly submitErrorMessage = signal<string>('');
  protected readonly alreadyRegistered = signal(false);
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);

  protected readonly form = this.formBuilder.group({
    platform: this.formBuilder.control<CampaignPlatform | null>(null, [Validators.required]),
    accountUrl: ['', [Validators.required, httpUrlValidator]],
    note: [''],
    terms: [false, [Validators.requiredTrue]],
  });

  protected readonly platformOptions = computed(() =>
    (this.campaign()?.platforms ?? []).map((platform) => ({
      label: platformLabel(platform),
      value: platform,
    })),
  );

  protected readonly isUpcoming = computed(() => this.campaign()?.status === 'UPCOMING');
  private readonly now = createNowSignal({ enabled: this.isUpcoming });

  /** 'HH:MM:SS' until registration opens, or null once it has (or if unknown). */
  protected readonly openCountdown = computed(() =>
    this.isUpcoming() ? openCountdownLabel(this.campaign()?.startDate, this.now()) : null,
  );

  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;
  protected readonly formatMoney = formatMoney;

  constructor() {
    effect(() => {
      void this.load(this.slug());
    });
  }

  protected reload(): void {
    void this.load(this.slug());
  }

  protected fieldError(field: 'platform' | 'accountUrl' | 'terms'): string | null {
    return firstErrorMessage(this.form.controls[field], MESSAGES[field], this.submitted());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.submitErrorMessage.set('');

    const campaign = this.campaign();
    if (!campaign || this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { platform, accountUrl, note } = this.form.getRawValue();
    if (!platform) {
      return;
    }

    this.submitting.set(true);
    try {
      await this.registrations.create({
        campaignSlug: campaign.slug,
        platform,
        accountUrl: accountUrl.trim(),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      this.messages.add({
        severity: 'success',
        summary: 'Application submitted',
        detail: `You applied to ${campaign.title || campaign.brand.name}.`,
      });
      await this.router.navigateByUrl('/creator/dashboard');
    } catch (error) {
      this.handleSubmitError(error);
    } finally {
      this.submitting.set(false);
    }
  }

  private handleSubmitError(error: unknown): void {
    if (!(error instanceof ApiError)) {
      this.submitErrorMessage.set('We could not submit your application. Please try again.');
      return;
    }
    switch (error.code) {
      case 'ALREADY_REGISTERED':
        this.alreadyRegistered.set(true);
        return;
      case 'REGISTRATION_CLOSED':
        this.submitErrorMessage.set('Registration for this campaign has just closed.');
        this.campaign.update((campaign) =>
          campaign ? { ...campaign, registrationOpen: false } : campaign,
        );
        return;
      case 'CAMPAIGN_NOT_FOUND':
        this.submitErrorMessage.set('This campaign is no longer available.');
        return;
      default:
        this.submitErrorMessage.set(error.message);
    }
  }

  private async load(slug: string): Promise<void> {
    this.state.set('loading');
    this.alreadyRegistered.set(false);
    try {
      const campaign = await this.campaignsRepository.bySlug(slug);
      this.campaign.set(campaign);
      if (campaign.platforms.length === 1) {
        this.form.controls.platform.setValue(campaign.platforms[0]);
      }
      this.state.set('ready');
    } catch (error) {
      this.campaign.set(null);
      if (error instanceof ApiError && error.isNotFound) {
        this.state.set('not-found');
        return;
      }
      this.loadErrorMessage.set(
        error instanceof ApiError ? error.message : 'We could not load this campaign.',
      );
      this.state.set('error');
    }
  }
}
