import {
  fitWithin,
  formatBytes,
  MAX_SCREENSHOT_BYTES,
  MAX_SCREENSHOT_EDGE,
  screenshotFileError,
} from './image-resize';

describe('fitWithin', () => {
  it('leaves an image that is already small enough alone', () => {
    expect(fitWithin({ width: 800, height: 600 })).toEqual({ width: 800, height: 600 });
  });

  it('scales the longest edge down to the cap and keeps the aspect ratio', () => {
    expect(fitWithin({ width: 4000, height: 3000 })).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin({ width: 1170, height: 2532 }, 1600)).toEqual({ width: 739, height: 1600 });
  });

  it('never returns a zero dimension', () => {
    expect(fitWithin({ width: 3000, height: 1 })).toEqual({ width: 1600, height: 1 });
    expect(fitWithin({ width: 0, height: 0 })).toEqual({ width: 1, height: 1 });
  });

  it('honours a custom edge', () => {
    expect(fitWithin({ width: 2000, height: 1000 }, 700)).toEqual({ width: 700, height: 350 });
  });

  it('defaults to the shared screenshot cap', () => {
    expect(fitWithin({ width: 5000, height: 5000 })).toEqual({
      width: MAX_SCREENSHOT_EDGE,
      height: MAX_SCREENSHOT_EDGE,
    });
  });
});

describe('formatBytes', () => {
  it('prints MB above a megabyte and KB below it', () => {
    expect(formatBytes(12_400_000)).toBe('11.8 MB');
    expect(formatBytes(840_000)).toBe('820 KB');
  });

  it('never reports a non-empty file as 0 KB', () => {
    expect(formatBytes(12)).toBe('1 KB');
  });
});

describe('screenshotFileError', () => {
  it('accepts an image within the size cap', () => {
    expect(screenshotFileError({ type: 'image/png', size: 900_000 })).toBeNull();
  });

  it('rejects a file that is not an image', () => {
    expect(screenshotFileError({ type: 'application/pdf', size: 1000 })).toContain('not an image');
  });

  it('rejects an image over 10 MB and says how big it was', () => {
    const message = screenshotFileError({ type: 'image/jpeg', size: MAX_SCREENSHOT_BYTES + 1 });

    expect(message).toContain('under 10 MB');
    expect(message).toContain('MB.');
  });
});
