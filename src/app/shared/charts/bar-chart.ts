import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';

// Register only what a plain bar chart needs; `chart.js/auto` pulls in every
// controller, scale and plugin and roughly triples the bundle cost.
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

/** Brand orange, used when the theme variable is unreadable (SSR, tests). */
const FALLBACK_BAR_COLOR = '#EC612C';

function barColor(): string {
  return (
    getComputedStyle(document.documentElement).getPropertyValue('--p-primary-color').trim() ||
    FALLBACK_BAR_COLOR
  );
}

/**
 * Minimal chart.js bar chart. The parent owns the size — give the element a
 * height (e.g. `<div class="h-64"><app-bar-chart …/></div>`) or the canvas
 * collapses.
 *
 * The chart is created once and then mutated in place, so changing `labels` or
 * `values` animates rather than tearing down the canvas.
 */
@Component({
  selector: 'app-bar-chart',
  template: `
    <canvas #canvas role="img" class="block h-full w-full" [attr.aria-label]="ariaLabel()"></canvas>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
  `,
})
export class BarChart {
  readonly labels = input<string[]>([]);
  readonly values = input<number[]>([]);
  /** Required for a11y: a canvas is otherwise an unlabelled graphic. */
  readonly ariaLabel = input('');

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart<'bar', number[], string> | null = null;

  constructor() {
    afterNextRender(() => this.create());

    effect(() => {
      // Read both inputs first so the effect tracks them even before the
      // canvas exists and the early return below fires.
      const labels = this.labels();
      const values = this.values();
      const chart = this.chart;
      if (!chart) {
        return;
      }
      chart.data.labels = labels;
      chart.data.datasets[0].data = values;
      chart.update();
    });

    inject(DestroyRef).onDestroy(() => {
      this.chart?.destroy();
      this.chart = null;
    });
  }

  /** No-ops without a 2d context, which is how this stays SSR- and test-safe. */
  private create(): void {
    const context = this.canvas().nativeElement.getContext('2d');
    if (!context) {
      return;
    }

    this.chart = new Chart<'bar', number[], string>(context, {
      type: 'bar',
      data: {
        labels: this.labels(),
        datasets: [
          {
            data: this.values(),
            backgroundColor: barColor(),
            borderRadius: 4,
            borderSkipped: false,
            maxBarThickness: 14,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: false },
          tooltip: { displayColors: false },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { maxRotation: 0, autoSkipPadding: 12 },
          },
          y: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: 'rgba(15, 23, 42, 0.06)' },
            ticks: { precision: 0, maxTicksLimit: 5 },
          },
        },
      },
    });
  }
}
