import { Component, inject, input, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ONBOARDING_PATH } from '../../core/auth/onboarding-guard';
import { Lock } from '@primeicons/angular/lock';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { ApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth-service';
import {
  isChunkLoadError,
  NEXT_PAGE_FAILED_MESSAGE,
  reloadForFreshBundle,
} from '../../core/routing/chunk-reload';
import { SignUpPayload } from '../../core/models/user';
import { GHANA_DIAL_CODE, isGhanaMobile, normalizeGhanaMobile } from '../../core/util/ghana-phone';
import { firstErrorMessage } from '../../shared/forms/form-errors';

/** Only Ghanaians can register for now: the number must be a Ghana mobile. */
const ghanaMobileValidator: ValidatorFn = (control) =>
  !control.value || isGhanaMobile(String(control.value)) ? null : { ghanaMobile: true };

const MESSAGES: Record<string, Record<string, string>> = {
  fullName: {
    required: 'Tell us the name brands should see.',
    minlength: 'Use at least 2 characters.',
  },
  email: { required: 'An email address is required.', email: 'Enter a valid email address.' },
  password: {
    required: 'Choose a password.',
    minlength: 'Passwords must be at least 8 characters.',
  },
  whatsapp: { required: 'Your WhatsApp username is required.' },
  phone: {
    required: 'Your phone number is required.',
    ghanaMobile: 'Enter a Ghana mobile number, for example 024 123 4567.',
  },
  terms: { required: 'Accept the ClapOut terms to create your account.' },
};

type ErrorField = 'fullName' | 'email' | 'password' | 'whatsapp' | 'phone' | 'terms';

@Component({
  imports: [
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    Lock,
    MessageModule,
    PasswordModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  selector: 'app-sign-up',
  templateUrl: './sign-up.html',
})
export class SignUp {
  /** Bound from `?returnUrl=` via `withComponentInputBinding()`. */
  readonly returnUrl = input<string>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly dialCode = GHANA_DIAL_CODE;

  protected readonly form = this.formBuilder.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    whatsapp: ['', [Validators.required]],
    phone: ['', [Validators.required, ghanaMobileValidator]],
    // Consent is a client-side gate; the API contract carries no `terms` field.
    terms: [false, [Validators.requiredTrue]],
  });

  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string>('');

  protected fieldError(field: ErrorField): string | null {
    return firstErrorMessage(this.form.controls[field], MESSAGES[field], this.submitted());
  }

  protected signInLink(): unknown[] {
    return ['/auth/sign-in'];
  }

  protected signInQuery(): Record<string, string> {
    const target = this.returnUrl();
    return target ? { returnUrl: target } : {};
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set('');

    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    try {
      await this.auth.signUp(this.buildPayload());
    } catch (error) {
      this.errorMessage.set(
        error instanceof ApiError
          ? error.code === 'EMAIL_TAKEN'
            ? 'That email already has a ClapOut account. Sign in instead.'
            : error.message
          : 'We could not create your account. Please try again.',
      );
      this.submitting.set(false);
      return;
    }

    // The account exists and the session is live; a failure from here on is
    // the next page not loading, not the sign-up. Every new creator goes
    // through onboarding first; the page they asked for waits in `returnUrl`.
    const returnUrl = this.returnUrl();
    const target = returnUrl
      ? `${ONBOARDING_PATH}?returnUrl=${encodeURIComponent(returnUrl)}`
      : ONBOARDING_PATH;
    try {
      await this.router.navigateByUrl(target);
    } catch (error) {
      if (isChunkLoadError(error) && reloadForFreshBundle(target)) {
        return;
      }
      this.errorMessage.set(NEXT_PAGE_FAILED_MESSAGE);
    } finally {
      this.submitting.set(false);
    }
  }

  private buildPayload(): SignUpPayload {
    const { fullName, email, password, whatsapp, phone } = this.form.getRawValue();
    return {
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      whatsapp: whatsapp.trim(),
      // One international string, because the admin table builds `wa.me` links
      // straight off this value. The validator has already vouched for it.
      phone: normalizeGhanaMobile(phone) ?? phone.trim(),
    };
  }
}
