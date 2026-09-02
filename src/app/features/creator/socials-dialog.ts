import { HttpClient } from '@angular/common/http';
import { Component, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import {
  FormArray,
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Plus } from '@primeicons/angular/plus';
import { Trash } from '@primeicons/angular/trash';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { firstValueFrom } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { APP_ENVIRONMENT } from '../../core/config/app-environment';
import { Me, SocialAccount } from '../../core/models/user';
import { firstErrorMessage, httpUrlValidator } from '../../shared/components/form-errors';

const LINK_MESSAGES: Record<string, string> = {
  required: 'Add the link, or remove this row.',
  url: 'Enter a full URL, for example https://www.tiktok.com/@yourname.',
};

/**
 * "Add your social accounts" from the creator dashboard checklist.
 *
 * Saves through `PATCH /me` directly rather than `AuthService`, which exposes no
 * profile mutation yet and holds `user` as a read-only signal. The saved list is
 * emitted back to the parent so the checklist can flip to done without waiting
 * for the next `GET /me`.
 *
 * The template is inline because this component ships as a single file, matching
 * every other one-file component under `shared/`.
 */
@Component({
  imports: [
    ButtonModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    Plus,
    ReactiveFormsModule,
    Trash,
  ],
  selector: 'app-socials-dialog',
  template: `
    <p-dialog
      header="Add your social accounts"
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
      [dismissableMask]="true"
      [style]="{ width: '34rem' }"
      [breakpoints]="{ '640px': '92vw' }"
    >
      <p class="mt-0 mb-5 text-sm text-surface-600">
        Paste the public profile link for every account you clip from - TikTok, YouTube or
        Instagram. Brands check these before they accept an application.
      </p>

      @if (errorMessage(); as message) {
        <div class="mb-4">
          <p-message severity="error" [closable]="false">{{ message }}</p-message>
        </div>
      }

      <div class="flex flex-col gap-4">
        @for (control of links.controls; track $index) {
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-surface-800" [for]="'social-url-' + $index"
              >Profile link {{ $index + 1 }}</label
            >
            <div class="flex items-start gap-2">
              <input
                pInputText
                type="url"
                inputmode="url"
                class="w-full"
                placeholder="https://www.tiktok.com/@yourname"
                [id]="'social-url-' + $index"
                [formControl]="control"
                [attr.aria-invalid]="linkError($index) ? 'true' : null"
              />
              <button
                type="button"
                class="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-surface-200 bg-surface-0 text-surface-600 hover:bg-surface-100"
                [attr.aria-label]="'Remove profile link ' + ($index + 1)"
                (click)="removeLink($index)"
              >
                <svg data-p-icon="trash" [size]="14" aria-hidden="true"></svg>
              </button>
            </div>
            @if (linkError($index); as fieldMessage) {
              <p class="m-0 text-sm text-red-700">{{ fieldMessage }}</p>
            }
          </div>
        } @empty {
          <p class="m-0 text-sm text-surface-600">
            You have no links left. Add one, or save to clear your social accounts.
          </p>
        }
      </div>

      <button
        type="button"
        class="mt-4 inline-flex items-center gap-2 rounded-lg border border-dashed border-surface-300 px-3 py-2 text-sm font-medium text-surface-700 hover:bg-surface-100"
        (click)="addLink()"
      >
        <svg data-p-icon="plus" [size]="12" aria-hidden="true"></svg>
        <span>Add another link</span>
      </button>

      <div class="mt-6 flex justify-end gap-3 border-t border-surface-200 pt-4">
        <p-button
          label="Cancel"
          severity="secondary"
          [text]="true"
          [disabled]="saving()"
          (onClick)="cancel()"
        />
        <p-button
          label="Save socials"
          [loading]="saving()"
          [disabled]="saving()"
          (onClick)="save()"
        />
      </div>
    </p-dialog>
  `,
})
export class SocialsDialog {
  /** Two-way: the dashboard opens it, the dialog closes itself. */
  readonly visible = model(false);
  /** Seeds the rows every time the dialog opens. */
  readonly socials = input<SocialAccount[]>([]);
  /** The list `PATCH /me` echoed back, so the caller can drop its stale copy. */
  readonly saved = output<SocialAccount[]>();

  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(APP_ENVIRONMENT).apiBaseUrl;
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly messages = inject(MessageService);

  protected readonly links = new FormArray<FormControl<string>>([]);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');

  constructor() {
    // Reopening always starts from the saved list, so an abandoned edit never
    // leaks into the next visit.
    effect(() => {
      if (this.visible()) {
        untracked(() => this.reset());
      }
    });
  }

  protected linkError(index: number): string | null {
    return firstErrorMessage(this.links.at(index), LINK_MESSAGES, this.submitted());
  }

  protected addLink(): void {
    this.links.push(this.createLink());
  }

  protected removeLink(index: number): void {
    this.links.removeAt(index);
  }

  protected cancel(): void {
    this.visible.set(false);
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.errorMessage.set('');

    if (this.saving()) {
      return;
    }
    if (this.links.invalid) {
      this.links.markAllAsTouched();
      return;
    }

    // Two rows pointing at the same profile would be stored twice, so the list
    // is de-duplicated before it leaves the browser.
    const urls = [
      ...new Set(this.links.controls.map((control) => control.value.trim()).filter(Boolean)),
    ];

    this.saving.set(true);
    try {
      const response = await firstValueFrom(
        this.http.patch<{ user: Me }>(`${this.baseUrl}/me`, {
          socials: urls.map((url) => ({ url })),
        }),
      );
      this.saved.emit(response.user?.socials ?? urls.map((url) => ({ url })));
      this.messages.add({
        severity: 'success',
        summary: 'Social accounts saved',
        detail: urls.length === 1 ? '1 link saved.' : `${urls.length} links saved.`,
      });
      this.visible.set(false);
    } catch (error) {
      this.errorMessage.set(toApiError(error).message);
    } finally {
      this.saving.set(false);
    }
  }

  private createLink(url = ''): FormControl<string> {
    return this.formBuilder.control(url, [Validators.required, httpUrlValidator]);
  }

  private reset(): void {
    this.submitted.set(false);
    this.errorMessage.set('');
    this.saving.set(false);
    this.links.clear();
    const seeded = this.socials();
    if (seeded.length === 0) {
      this.links.push(this.createLink());
      return;
    }
    for (const account of seeded) {
      this.links.push(this.createLink(account.url));
    }
  }
}
