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
      <path
        d="M12 2c-3.6 0-6 2.6-6 6.2v2.6c-.6.3-1.4 0-1.9.4-.3.3 0 .9.7 1.2l1.2.5c-.5 1.5-1.8 2.7-3.3 3.2-.5.2-.5.7-.1.9.7.4 1.6.5 2.3.7.1.4.2 1 .5 1.2.5.2 1.4-.2 2.4 0 1.2.3 2.2 1.9 4.2 1.9s3-1.6 4.2-1.9c1-.2 1.9.2 2.4 0 .3-.2.4-.8.5-1.2.7-.2 1.6-.3 2.3-.7.4-.2.4-.7-.1-.9-1.5-.5-2.8-1.7-3.3-3.2l1.2-.5c.7-.3 1-.9.7-1.2-.5-.4-1.3-.1-1.9-.4V8.2C18 4.6 15.6 2 12 2Z"
      />
    </svg>
  `,
})
export class SnapchatIcon {
  /** Edge length in px, matching the `[size]` the PrimeIcons glyphs take. */
  readonly size = input(16);
}
