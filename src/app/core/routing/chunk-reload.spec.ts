import { afterEach, describe, expect, it, vi } from 'vitest';
import { isChunkLoadError, reloadForFreshBundle } from './chunk-reload';

describe('isChunkLoadError', () => {
  it('recognises the errors browsers raise for a missing lazy chunk', () => {
    expect(
      isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /chunk-ABC.js')),
    ).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    const chunkError = new Error('Loading chunk 42 failed.');
    chunkError.name = 'ChunkLoadError';
    expect(isChunkLoadError(chunkError)).toBe(true);
  });

  it('ignores everything else', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError({ status: 500 })).toBe(false);
  });
});

describe('reloadForFreshBundle', () => {
  afterEach(() => sessionStorage.clear());

  it('hard-loads the target once, then refuses to loop on the same URL', () => {
    const assign = vi.fn();

    expect(reloadForFreshBundle('/admin/dashboard', assign)).toBe(true);
    expect(assign).toHaveBeenCalledWith(new URL('/admin/dashboard', location.origin).href);

    expect(reloadForFreshBundle('/admin/dashboard', assign)).toBe(false);
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it('treats a different URL as a fresh attempt', () => {
    const assign = vi.fn();
    reloadForFreshBundle('/admin/dashboard', assign);

    expect(reloadForFreshBundle('/creator/dashboard', assign)).toBe(true);
    expect(assign).toHaveBeenCalledTimes(2);
  });
});
