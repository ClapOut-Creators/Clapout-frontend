import { Component, computed, input } from '@angular/core';

/**
 * Value colour. `neutral` is the design's near-black; `attention` is the orange
 * the Figma "Needs attention" card paints its number.
 */
export type StatCardTone = 'neutral' | 'attention';

const TONE_CLASSES: Record<StatCardTone, string> = {
  neutral: 'text-[#171A1C]',
  attention: 'text-[#EC612C]',
};

/**
 * One headline number, sized from the admin design's 109px stat card: an 18px
 * grey label, then a 25px semibold value on a 38px line.
 */
@Component({
  selector: 'app-stat-card',
  styles: `
    /* The opt-in phone card: 95px, r10, 14px label, 18px Poppins value. */
    @media (max-width: 639px) {
      .co-stat-phone {
        min-height: 95px;
        border-radius: 10px;
        padding: 16px 18px 20px;
      }
      .co-stat-phone dt {
        font-size: 14px;
        line-height: 17px;
      }
      .co-stat-phone dd {
        margin-top: 14px;
      }
      .co-stat-phone dd > span {
        font-family: var(--clapout-font-heading);
        font-size: 18px;
        line-height: 27px;
      }
    }
  `,
  template: `
    <div
      class="flex min-h-[109px] flex-col justify-center rounded-xl border border-[#ECECEC] bg-[#FFFFFF] px-[18px] pt-4 pb-5"
      [class.co-stat-phone]="phoneCompact()"
    >
      <dt class="text-[18px] leading-[21px] text-[#808080]">{{ label() }}</dt>
      <dd class="m-0 mt-[13px] flex items-center gap-2">
        <span class="text-[25px] leading-[38px] font-semibold tabular-nums" [class]="toneClass()">{{
          value()
        }}</span>
      </dd>
      @if (hint()) {
        <p class="mt-1 text-xs text-surface-500">{{ hint() }}</p>
      }
    </div>
  `,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input<string>();
  readonly tone = input<StatCardTone>('neutral');
  /**
   * The clipper boards draw a 2x2 grid of 95px cards on a phone (Figma 397:2720:
   * 14px label, 18px Poppins value, r10). Opt-in so the admin pages keep their
   * desktop card at every width.
   */
  readonly phoneCompact = input(false);

  protected readonly toneClass = computed(() => TONE_CLASSES[this.tone()]);
}
