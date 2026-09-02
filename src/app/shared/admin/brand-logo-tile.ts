import { Component, computed, effect, input, signal } from '@angular/core';

/** Beyond this width:height ratio a logo is a wordmark, not a square mark. */
const WIDE_ASPECT_RATIO = 1.2;

/** The brand swatch used on cards, tables and headers. */
@Component({
  selector: 'app-brand-logo-tile',
  template: `
    <span
      class="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#ECECEC]"
      [class]="sizeClass()"
      [style.background-color]="logoBg()"
    >
      @if (logoUrl()) {
        <img
          [src]="logoUrl()"
          [alt]="name() + ' logo'"
          [class]="imageClass()"
          (load)="onImageLoad($event)"
        />
      } @else {
        <span class="px-1 text-center text-xs font-semibold text-white">{{ initials() }}</span>
      }
    </span>
  `,
})
export class BrandLogoTile {
  readonly name = input<string>('');
  readonly logoUrl = input<string | null>(null);
  readonly logoBg = input<string>('#0B51F0');
  readonly logoFit = input<'cover' | 'contain'>('cover');
  /** Tailwind sizing, e.g. 'h-16 w-28' for cards or 'h-10 w-10' for tables. */
  readonly sizeClass = input<string>('h-16 w-28');

  /** Set once the image loads and turns out to be a wide wordmark. */
  private readonly wideImage = signal(false);

  /**
   * `cover` crops a wide wordmark to its middle ("E-WALE" became "-WALE" in the
   * square table tiles), so a wide image falls back to `contain` on the brand
   * background with a small inset — the whole mark shows, as it does in Figma.
   * Square and tall images keep `cover` so they fill the tile.
   */
  protected readonly imageClass = computed(() =>
    this.logoFit() === 'contain' || this.wideImage()
      ? 'h-full w-full object-contain p-[12%]'
      : 'h-full w-full object-cover',
  );

  constructor() {
    // Instances are reused across rows, so a new source starts unmeasured
    // rather than inheriting the previous logo's aspect ratio.
    effect(() => {
      this.logoUrl();
      this.wideImage.set(false);
    });
  }

  protected onImageLoad(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (image.naturalHeight > 0) {
      this.wideImage.set(image.naturalWidth / image.naturalHeight > WIDE_ASPECT_RATIO);
    }
  }

  protected initials(): string {
    return (
      this.name()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || '?'
    );
  }
}
