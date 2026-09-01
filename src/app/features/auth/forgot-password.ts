import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth-service';
import { firstErrorMessage } from '../../shared/forms/form-errors';

const MESSAGES: Record<string, string> = {
  required: 'Enter the email address you signed up with.',
  email: 'Enter a valid email address.',
};

/**
 * Step one of password reset. The API answers 200 whether or not the account
 * exists, so the confirmation copy is deliberately non-committal — it must not
 * become an account-enumeration oracle.
 */
@Component({
  imports: [ButtonModule, InputTextModule, MessageModule, ReactiveFormsModule, RouterLink],
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string>('');
  /** A 422 from the API, shown under the field rather than as a banner. */
  protected readonly emailApiError = signal<string>('');
  /** Set once the request succeeds; also drives the confirmation state. */
  protected readonly sentTo = signal<string>('');

  protected fieldError(): string | null {
    return (
      firstErrorMessage(this.form.controls.email, MESSAGES, this.submitted()) ||
      this.emailApiError() ||
      null
    );
  }

  /** Returns to the form with the address prefilled, ready to be corrected. */
  protected tryDifferentEmail(): void {
    this.sentTo.set('');
    this.submitted.set(false);
    this.errorMessage.set('');
    this.emailApiError.set('');
    this.form.controls.email.markAsUntouched();
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set('');
    this.emailApiError.set('');

    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const email = this.form.controls.email.value.trim();
    this.submitting.set(true);
    try {
      await this.auth.requestPasswordReset(email);
      this.sentTo.set(email);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        this.emailApiError.set(error.message || 'Enter a valid email address.');
      } else {
        this.errorMessage.set(
          error instanceof ApiError
            ? error.message
            : 'We could not send the reset link. Please try again.',
        );
      }
    } finally {
      this.submitting.set(false);
    }
  }
}
