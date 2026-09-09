/**
 * Client-side screenshot downscaling for content submissions.
 *
 * `Submission.screenshotUrl` travels inside the JSON body (there is no object
 * storage in this slice) and the API rejects anything over 700 000 characters,
 * so a 4 MB phone screenshot has to be shrunk in the browser before it is sent.
 * The existing `image-input`/wizard uploads only read a file with
 * `FileReader.readAsDataURL` and cap the size, which would reject most real
 * screenshots outright — hence this helper rather than a reuse.
 */

/** Longest edge of the resized image, in CSS pixels. */
export const MAX_SCREENSHOT_EDGE = 1600;
/** Starting JPEG quality; dropped stepwise while the data URL is too long. */
export const SCREENSHOT_QUALITY = 0.82;
/** The API's hard limit on `screenshotUrl`. */
export const MAX_SCREENSHOT_CHARS = 700_000;
/** Originals above this are rejected before any decoding work is attempted. */
export const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;

/** Quality ladder used when the first encode is still over the character cap. */
const QUALITY_STEPS = [0.72, 0.62, 0.52, 0.42] as const;
/** Below this the picture is unreadable, so the edge shrinks instead. */
const EDGE_STEPS = [1200, 900, 700] as const;

export interface Size {
  width: number;
  height: number;
}

/**
 * Scales `size` so its longest edge is at most `maxEdge`, preserving the aspect
 * ratio. Images already within the limit are returned unchanged (never upscaled)
 * and every result is at least 1x1 so canvas never receives a zero dimension.
 */
export function fitWithin(size: Size, maxEdge: number = MAX_SCREENSHOT_EDGE): Size {
  const width = Math.max(0, Math.round(size.width));
  const height = Math.max(0, Math.round(size.height));
  const longest = Math.max(width, height);
  if (longest === 0) {
    return { width: 1, height: 1 };
  }
  if (longest <= maxEdge) {
    return { width: Math.max(1, width), height: Math.max(1, height) };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Human file size for the "too large" message: '12.4 MB', '820 KB'. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Why a picked file cannot be used, or null when it is fine. */
export function screenshotFileError(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith('image/')) {
    return 'That file is not an image. Pick a screenshot (PNG, JPG or HEIC).';
  }
  if (file.size > MAX_SCREENSHOT_BYTES) {
    return `That image is ${formatBytes(file.size)}. Pick one under 10 MB.`;
  }
  return null;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('unreadable-image'));
    image.src = dataUrl;
  });
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('unreadable-file'));
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('unreadable-file'));
    reader.readAsDataURL(file);
  });
}

function encode(image: HTMLImageElement, maxEdge: number, quality: number): string | null {
  const { width, height } = fitWithin(
    { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height },
    maxEdge,
  );
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }
  // Screenshots are usually opaque anyway; a white ground keeps transparent PNGs
  // from turning black when they are re-encoded as JPEG.
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Reads an image file and returns a JPEG `data:` URL no longer than
 * {@link MAX_SCREENSHOT_CHARS}, resized to {@link MAX_SCREENSHOT_EDGE} on its
 * longest side. Quality is dropped first, then the edge, so text in an
 * analytics screenshot stays legible for as long as possible.
 *
 * Throws `Error('unreadable-file')`, `Error('unreadable-image')` or
 * `Error('canvas-unavailable')`; `Error('too-large')` when even the smallest
 * encode is over the cap.
 */
export async function resizeImageToDataUrl(
  file: Blob,
  maxEdge: number = MAX_SCREENSHOT_EDGE,
  maxChars: number = MAX_SCREENSHOT_CHARS,
): Promise<string> {
  const image = await loadImage(await readAsDataUrl(file));

  const first = encode(image, maxEdge, SCREENSHOT_QUALITY);
  if (first === null) {
    throw new Error('canvas-unavailable');
  }
  if (first.length <= maxChars) {
    return first;
  }

  for (const quality of QUALITY_STEPS) {
    const candidate = encode(image, maxEdge, quality);
    if (candidate !== null && candidate.length <= maxChars) {
      return candidate;
    }
  }
  for (const edge of EDGE_STEPS) {
    for (const quality of [SCREENSHOT_QUALITY, ...QUALITY_STEPS]) {
      const candidate = encode(image, edge, quality);
      if (candidate !== null && candidate.length <= maxChars) {
        return candidate;
      }
    }
  }
  throw new Error('too-large');
}
