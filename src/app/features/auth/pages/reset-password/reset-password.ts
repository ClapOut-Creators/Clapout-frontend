import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { ApiError } from '../../../../core/api/api-error';
import { AuthService } from '../../../../core/auth/auth-service';
import { fieldsMatchValidator, firstErrorMessage } from '../../../../shared/components/form-errors';

const MESSAGES: Record<string, Record<string, string>> = {
  password: {
    required: 'Choose a new password.',
    minlength: 'Passwords must be at least 8 characters.',
  },
  confirmPassword: { required: 'Re-enter your new password.' },
};

/** 'form' until submitted; 'success' after the password is changed. */
type ResetState = 'form' | 'success';

/**
 * Step two of password reset, reached from the emailed link
 * (`/auth/reset-password?token=…`). Resetting does not sign the user in — the
 * success state routes them to sign-in with their new password.
 */
@Component({
  imports: [ButtonModule, MessageModule, PasswordModule, ReactiveFormsModule, RouterLink],
  selector: 'app-reset-password',
  templateUrl: './reset-password.html',
})
export class ResetPassword {
  /** Bound from `?token=` via `withComponentInputBinding()`. */
  readonly token = input<string>();

  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly form = this.formBuilder.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: fieldsMatchValidator('password', 'confirmPassword') },
  );

  protected readonly state = signal<ResetState>('form');
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string>('');
  /** True once the API rejects the token, so the form is replaced with guidance. */
  protected readonly tokenRejected = signal(false);

  /** No token in the URL means the link was truncated or hand-typed. */
  protected hasToken(): boolean {
    return !!this.token()?.trim();
  }

  protected fieldError(field: 'password' | 'confirmPassword'): string | null {
    const ownError = firstErrorMessage(
      this.form.controls[field],
      MESSAGES[field],
      this.submitted(),
    );
    if (ownError) {
      return ownError;
    }
    if (
      field === 'confirmPassword' &&
      this.form.hasError('fieldsMismatch') &&
      (this.form.controls.confirmPassword.touched || this.submitted())
    ) {
      return 'Both passwords must match.';
    }
    return null;
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set('');

    const token = this.token()?.trim();
    if (!token || this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    try {
      await this.auth.resetPassword(token, this.form.controls.password.value);
      this.state.set('success');
    } catch (error) {
      this.handleError(error);
    } finally {
      this.submitting.set(false);
    }
  }

  private handleError(error: unknown): void {
    if (!(error instanceof ApiError)) {
      this.errorMessage.set('We could not update your password. Please try again.');
      return;
    }
    if (error.code === 'INVALID_RESET_TOKEN' || error.status === 400) {
      this.tokenRejected.set(true);
      return;
    }
    if (error.status === 422) {
      this.errorMessage.set(error.message || 'Passwords must be at least 8 characters.');
      return;
    }
    this.errorMessage.set(error.message);
  }
}
