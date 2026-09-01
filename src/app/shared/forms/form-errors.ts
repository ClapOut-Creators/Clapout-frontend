import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Resolves the first matching validation message for a control, but only once
 * the field has been touched or the form has been submitted.
 */
export function firstErrorMessage(
  control: AbstractControl | null | undefined,
  messages: Record<string, string>,
  submitted: boolean,
): string | null {
  if (!control || control.valid || !(control.touched || submitted)) {
    return null;
  }
  for (const key of Object.keys(messages)) {
    if (control.hasError(key)) {
      return messages[key];
    }
  }
  return 'Please check this field.';
}

/**
 * Group-level validator flagging two fields that must hold the same value
 * (password + confirmation). Stays quiet while the confirmation is empty so the
 * control's own `required` validator owns that message, and reports on the
 * group rather than mutating the control's errors.
 */
export function fieldsMatchValidator(field: string, confirmField: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const value = group.get(field)?.value;
    const confirmation = group.get(confirmField)?.value;
    if (!confirmation) {
      return null;
    }
    return value === confirmation ? null : { fieldsMismatch: true };
  };
}

/** Requires an absolute http(s) URL, e.g. a creator's public profile link. */
export const httpUrlValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = control.value;
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? null : { url: true };
  } catch {
    return { url: true };
  }
};
