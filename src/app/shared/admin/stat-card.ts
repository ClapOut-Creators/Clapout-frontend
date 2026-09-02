import { Component, input } from '@angular/core';

/** One headline number, styled like the admin dashboard's stat row. */
@Component({
  selector: 'app-stat-card',
  template: `
    <div class="rounded-xl border border-[#ECECEC] bg-[#FFFFFF] p-4">
      <dt class="text-sm text-surface-500">{{ label() }}</dt>
      <dd class="m-0 mt-2 flex items-center gap-2">
        <span class="text-2xl font-semibold tabular-nums text-surface-950">{{ value() }}</span>
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
}
