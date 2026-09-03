import { Component, input } from '@angular/core';

/**
 * The Snapchat ghost in one flat `currentColor`.
 *
 * PrimeIcons ships no Snapchat glyph, so every platform `@switch` that draws
 * `<svg data-p-icon="tiktok" [size]="20">` for its neighbours would otherwise
 * paste the same inline path again. This component keeps that path in one place
 * and takes the same `size` input, so the switches read alike:
 * `<app-snapchat-icon [size]="20" />`.
 */
@Component({
  selector: 'app-snapchat-icon',
  host: { class: 'inline-flex' },
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3 18.7V12.2a9 9 0 0 1 18 0v6.5q-3 4.2-6 0-3 4.2-6 0-3 4.2-6 0Z" />
    </svg>
  `,
})
export class SnapchatIcon {
  /** Edge length in px, matching the `[size]` the PrimeIcons glyphs take. */
  readonly size = input(16);
}
