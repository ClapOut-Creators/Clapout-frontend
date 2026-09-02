import { Component, computed, effect, ElementRef, input, signal, viewChild } from '@angular/core';

/** Beyond this width:height ratio a logo is a wordmark, not a square mark. */
const WIDE_ASPECT_RATIO = 1.2;
/** At or below this edge length a cover-crop shows almost none of the mark. */
const SMALL_TILE_PX = 40;

/** The brand swatch used on cards, tables and headers. */
@Component({
  selector: 'app-brand-logo-tile',
  template: `
    <span
      #tile
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

  private readonly tile = viewChild.required<ElementRef<HTMLElement>>('tile');

  /** Set once the image loads and turns out to be a wide wordmark. */
  private readonly wideImage = signal(false);
  /** Set from the rendered box, since `sizeClass` is an opaque class string. */
  private readonly smallTile = signal(false);

  /**
   * `cover` crops a wide wordmark to its middle ("E-WALE" became "-WALE"), and on
   * a small badge it can crop away the mark entirely — a 24px tile showed as a
   * bare blue square. So a wide image, or any tile at or below 40px, falls back
   * to `contain` on the brand background. Small tiles get a tighter inset so the
   * mark still fills the badge, as it does in Figma.
   */
  protected readonly imageClass = computed(() => {
    const contain = this.logoFit() === 'contain' || this.wideImage() || this.smallTile();
    if (!contain) {
      return 'h-full w-full object-cover';
    }
    return this.smallTile()
      ? 'h-full w-full object-contain p-[10%]'
      : 'h-full w-full object-contain p-[12%]';
  });

  constructor() {
    // Instances are reused across rows, so a new source starts unmeasured
    // rather than inheriting the previous logo's aspect ratio.
    effect(() => {
      this.logoUrl();
      this.wideImage.set(false);
    });

    // The tile's size comes from a Tailwind class, so measure the box rather
    // than trying to parse it. ResizeObserver also catches responsive changes.
    effect((onCleanup) => {
      const element = this.tile().nativeElement;
      const measure = () =>
        this.smallTile.set(element.getBoundingClientRect().width <= SMALL_TILE_PX);
      measure();
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      onCleanup(() => observer.disconnect());
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
