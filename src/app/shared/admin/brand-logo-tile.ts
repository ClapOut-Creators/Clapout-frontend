import { Component, input } from '@angular/core';

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
          [class]="
            logoFit() === 'contain'
              ? 'h-full w-full object-contain p-2'
              : 'h-full w-full object-cover'
          "
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
