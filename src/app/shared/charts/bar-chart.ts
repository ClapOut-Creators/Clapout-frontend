import { Component, computed, input } from '@angular/core';
import { BarChart as EchartsBarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { EChartsCoreOption } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import type { CallbackDataParams } from 'echarts/types/dist/shared';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';

echarts.use([EchartsBarChart, GridComponent, TooltipComponent, CanvasRenderer]);

/** Brand orange, used when the theme variable is unreadable (SSR, tests). */
const FALLBACK_BAR_COLOR = '#EC612C';
/** Light tint for below-average days, used when the theme variable is unreadable. */
const FALLBACK_BAR_COLOR_LIGHT = '#F7C4B0';

function barColor(): string {
  if (typeof document === 'undefined') {
    return FALLBACK_BAR_COLOR;
  }
  return (
    getComputedStyle(document.documentElement).getPropertyValue('--p-primary-color').trim() ||
    FALLBACK_BAR_COLOR
  );
}

/**
 * The page's `body { zoom }` (styles.css `--ui-scale`), or 1 where it does not
 * apply. Chart sizes are multiplied by it so the un-zoomed chart still draws at
 * page scale.
 */
function uiScale(): number {
  if (typeof document === 'undefined') {
    return 1;
  }
  const raw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'));
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

function barColorLight(): string {
  if (typeof document === 'undefined') {
    return FALLBACK_BAR_COLOR_LIGHT;
  }
  return (
    getComputedStyle(document.documentElement).getPropertyValue('--p-primary-200').trim() ||
    FALLBACK_BAR_COLOR_LIGHT
  );
}

/**
 * Minimal Apache ECharts bar chart. The parent owns the size — give the host a
 * height (e.g. `<div class="h-52"><app-bar-chart …/></div>`) or the chart has
 * no drawing area.
 *
 * The host cancels the page zoom (see styles.css). Under `body { zoom: 0.8 }`
 * the canvas is laid out at 1.25× its visual size while mouse events arrive in
 * visual pixels, so ECharts read every hover ~25% too far left and the tooltip
 * named a day several columns before the bar under the cursor. With an
 * effective zoom of 1 the two coordinate spaces agree; the option sizes are
 * multiplied by the scale so the drawing itself still matches the page, and
 * the tooltip stays inside the host so it shares that coordinate space.
 */
@Component({
  imports: [NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  selector: 'app-bar-chart',
  template: `
    <div
      echarts
      class="block h-full w-full"
      role="img"
      [attr.aria-label]="ariaLabel()"
      [initOpts]="initOptions"
      [options]="chartOptions()"
    ></div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      zoom: calc(1 / var(--ui-scale, 1));
    }
  `,
})
export class BarChart {
  readonly labels = input<string[]>([]);
  readonly values = input<number[]>([]);
  /** Required for a11y: the chart region is otherwise an unlabelled graphic. */
  readonly ariaLabel = input('');

  protected readonly initOptions = { renderer: 'canvas' as const };
  /** Bars at/above the series average render in the brand orange; below render in a light tint. */
  private readonly average = computed(() => {
    const values = this.values();
    if (values.length === 0) {
      return 0;
    }
    return values.reduce((total, value) => total + value, 0) / values.length;
  });

  protected readonly chartOptions = computed<EChartsCoreOption>(() => {
    const scale = uiScale();
    return {
      animation: false,
      color: [barColor()],
      grid: {
        bottom: 28 * scale,
        containLabel: true,
        left: 8 * scale,
        right: 8 * scale,
        top: 16 * scale,
      },
      tooltip: {
        confine: true,
        padding: 10 * scale,
        // Drawn on the canvas rather than as a transformed <div>: Chrome
        // scales a composited translate() under nested zoom by the outer
        // zoom only, which parked the HTML tooltip ~20% left of the pointer.
        renderMode: 'richText',
        textStyle: { fontSize: 14 * scale },
        trigger: 'axis',
        valueFormatter: (value: unknown) => `${value}`,
      },
      xAxis: {
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#777777',
          fontSize: 11 * scale,
          hideOverlap: true,
        },
        data: this.labels(),
        type: 'category',
      },
      yAxis: {
        axisLine: { show: false },
        axisLabel: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: {
            color: '#ECECEC',
            type: 'dashed',
          },
        },
        type: 'value',
      },
      series: [
        {
          barMaxWidth: 8 * scale,
          data: this.values(),
          itemStyle: {
            borderRadius: 4 * scale,
            color: (params: CallbackDataParams) =>
              Number(params.value) >= this.average() ? barColor() : barColorLight(),
          },
          type: 'bar',
        },
      ],
    };
  });
}
