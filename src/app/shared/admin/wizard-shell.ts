import { Component, computed, input, output } from '@angular/core';
import { Times } from '@primeicons/angular/times';

/**
 * The full-viewport modal chrome shared by the campaign and brand wizards
 * (Figma 172:823 and 198:9402).
 *
 * Geometry comes straight from the node spec at the 1728px design width:
 * a 546px centred column, a 53px orange app-icon tile in a 326x125 rounded
 * header block, a 236x10 segmented progress track, then Poppins SemiBold 40
 * title over an SF Pro 22 subtitle. Widths are fluid; paddings, radii and font
 * sizes are the design's pixels.
 */
@Component({
  imports: [Times],
  selector: 'app-wizard-shell',
  template: `
    <div class="fixed inset-0 z-50 overflow-y-auto bg-white">
      <button
        type="button"
        class="absolute right-[86px] top-[82px] flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-[#CDCDCD] text-[#393939]"
        aria-label="Close"
        (click)="closed.emit()"
      >
        <svg data-p-icon="times" [size]="16" aria-hidden="true"></svg>
      </button>

      <div class="flex min-h-full flex-col items-center px-4 pb-16 pt-[75px]">
        <!-- App icon + segmented progress -->
        <div
          class="flex w-[326px] max-w-full flex-col items-center gap-2.5 rounded-[40px] px-11 py-[26px]"
        >
          <span
            class="flex h-[53px] w-[53px] items-center justify-center rounded-2xl bg-primary"
            aria-hidden="true"
          >
            <img src="/logo/clapout-hand.png" alt="" class="h-[43px] w-[43px]" draggable="false" />
          </span>

          <div
            class="flex h-2.5 w-[236px] max-w-full overflow-hidden rounded-[30px] bg-[#E0E0E0]"
            role="progressbar"
            [attr.aria-valuenow]="step() + 1"
            [attr.aria-valuemin]="1"
            [attr.aria-valuemax]="totalSteps()"
            [attr.aria-label]="'Step ' + (step() + 1) + ' of ' + totalSteps()"
          >
            <span
              class="h-full rounded-[30px] bg-[#F26522]"
              [style.width.%]="progressPercent()"
            ></span>
          </div>
        </div>

        <!-- Title + subtitle -->
        <div class="mt-[24px] w-[546px] max-w-full text-center">
          <h1 class="text-[40px] font-semibold leading-tight text-black/80">
            {{ title() }}
          </h1>
          @if (subtitle()) {
            <p class="mt-2 text-[22px] leading-snug text-[#464646]">{{ subtitle() }}</p>
          }
        </div>

        <!-- Fields / content -->
        <div class="mt-[42px] flex w-[546px] max-w-full flex-col gap-6">
          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class WizardShell {
  /** Zero-based index of the active step. */
  readonly step = input.required<number>();
  readonly totalSteps = input.required<number>();
  readonly title = input.required<string>();
  readonly subtitle = input<string>();

  readonly closed = output<void>();

  /** One filled segment per completed step, matching the 236/8 track in the spec. */
  protected readonly progressPercent = computed(() =>
    Math.min(100, ((this.step() + 1) / Math.max(1, this.totalSteps())) * 100),
  );
}
