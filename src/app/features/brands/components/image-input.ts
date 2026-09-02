import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

/** Inline images are embedded in the campaign row, so keep them small. */
export const MAX_IMAGE_BYTES = 500 * 1024;

/**
 * Picks an image either by uploading a small file (read to a `data:` URL) or by
 * pasting an https URL, and previews the result.
 *
 * The API accepts both forms; uploads are capped because the value travels
 * inside the campaign JSON body rather than through object storage.
 */
@Component({
  imports: [ButtonModule, FormsModule, InputTextModule],
  selector: 'app-image-input',
  template: `
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-start gap-4">
        <span
          class="flex items-center justify-center overflow-hidden rounded-xl border border-surface-200 bg-surface-50"
          [class]="previewClass()"
          [style.background-color]="previewBackground() || null"
        >
          @if (value()) {
            <img [src]="value()" [alt]="previewAlt()" class="h-full w-full object-contain" />
          } @else {
            <span class="px-2 text-center text-xs text-surface-500">No image</span>
          }
        </span>

        <div class="flex flex-col gap-2">
          <input
            type="file"
            accept="image/*"
            class="hidden"
            [id]="inputId()"
            (change)="onFileSelected($event)"
          />
          <label
            [for]="inputId()"
            class="inline-flex cursor-pointer items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-contrast"
            >Upload image</label
          >
          <p class="text-xs text-surface-500">PNG or JPG, up to 500 KB.</p>
          @if (value()) {
            <p-button
              label="Remove"
              severity="secondary"
              size="small"
              [text]="true"
              (onClick)="clear()"
            />
          }
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-surface-800" [for]="inputId() + '-url'"
          >Or paste an image URL</label
        >
        <input
          pInputText
          type="url"
          class="w-full"
          placeholder="https://…"
          [id]="inputId() + '-url'"
          [ngModel]="urlDraft()"
          (ngModelChange)="onUrlTyped($event)"
        />
      </div>

      @if (errorMessage()) {
        <p class="text-sm text-red-700">{{ errorMessage() }}</p>
      }
    </div>
  `,
})
export class ImageInput {
  /** Current value: an https URL or a `data:` URL. */
  readonly value = input<string | null>(null);
  /** Unique id prefix — the file input and URL input derive their ids from it. */
  readonly inputId = input.required<string>();
  readonly previewAlt = input('Selected image preview');
  /** Tailwind sizing for the preview box, e.g. 'h-24 w-40' for a banner. */
  readonly previewClass = input('h-24 w-40');
  /** Optional swatch behind a transparent logo. */
  readonly previewBackground = input<string | null>(null);

  readonly valueChange = output<string | null>();

  protected readonly errorMessage = signal('');
  private readonly typedUrl = signal<string | null>(null);

  /** Show a pasted URL, but never dump a huge data: URL into the text field. */
  protected readonly urlDraft = computed(() => {
    const typed = this.typedUrl();
    if (typed !== null) {
      return typed;
    }
    const current = this.value();
    return current && !current.startsWith('data:') ? current : '';
  });

  protected onUrlTyped(url: string): void {
    this.typedUrl.set(url);
    this.errorMessage.set('');
    this.valueChange.emit(url.trim() ? url.trim() : null);
  }

  protected clear(): void {
    this.typedUrl.set('');
    this.errorMessage.set('');
    this.valueChange.emit(null);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      const sizeKb = Math.round(file.size / 1024);
      this.errorMessage.set(
        `That image is ${sizeKb} KB. Please pick one under 500 KB, or paste a URL instead.`,
      );
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => this.errorMessage.set('We could not read that file. Try another image.');
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) {
        this.errorMessage.set('We could not read that file. Try another image.');
        return;
      }
      this.errorMessage.set('');
      this.typedUrl.set('');
      this.valueChange.emit(result);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }
}
