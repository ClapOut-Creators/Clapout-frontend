import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { ApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth-service';
import { SignUpPayload } from '../../core/models/user';
import { firstErrorMessage } from '../../shared/forms/form-errors';

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
  phone: { required: 'Your phone number is required.' },
};

@Component({
  imports: [
    ButtonModule,
    InputTextModule,
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

  protected readonly form = this.formBuilder.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    whatsapp: ['', [Validators.required]],
    phone: ['', [Validators.required]],
  });

  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string>('');

  protected fieldError(
    field: 'fullName' | 'email' | 'password' | 'whatsapp' | 'phone',
  ): string | null {
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
      await this.router.navigateByUrl(this.returnUrl() || '/creator/dashboard');
    } catch (error) {
      this.errorMessage.set(
        error instanceof ApiError
          ? error.code === 'EMAIL_TAKEN'
            ? 'That email already has a ClapOut account. Sign in instead.'
            : error.message
          : 'We could not create your account. Please try again.',
      );
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
      phone: phone.trim(),
    };
  }
}
