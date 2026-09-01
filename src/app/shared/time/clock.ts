import { DestroyRef, effect, inject, Signal, signal } from '@angular/core';

export interface ClockOptions {
  /** Tick period in milliseconds. Defaults to one second. */
  intervalMs?: number;
  /**
   * Gates the interval so pages without a live countdown do not run change
   * detection every second. Omit to tick unconditionally.
   */
  enabled?: Signal<boolean>;
}

/**
 * A signal that emits the current epoch millis on an interval, for live
 * countdowns. Must be called from an injection context (a field initializer or
 * constructor); the interval is cleared when the injector is destroyed.
 */
export function createNowSignal(options: ClockOptions = {}): Signal<number> {
  const intervalMs = options.intervalMs ?? 1_000;
  const now = signal(Date.now());
  let handle: ReturnType<typeof setInterval> | null = null;

  const stop = (): void => {
    if (handle !== null) {
      clearInterval(handle);
      handle = null;
    }
  };

  const start = (): void => {
    stop();
    now.set(Date.now());
    handle = setInterval(() => now.set(Date.now()), intervalMs);
  };

  const enabled = options.enabled;
  if (enabled) {
    effect(() => {
      if (enabled()) {
        start();
      } else {
        stop();
      }
    });
  } else {
    start();
  }

  inject(DestroyRef).onDestroy(stop);
  return now.asReadonly();
}
