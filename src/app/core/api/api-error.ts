import { HttpErrorResponse } from '@angular/common/http';

/** Backend error envelope: `{ "error": { "code": string, "message": string } }`. */
interface ApiErrorEnvelope {
  error?: { code?: unknown; message?: unknown };
}

/** Synthetic code used when the request never reached the API. */
export const NETWORK_ERROR = 'NETWORK_ERROR';
/** Synthetic code used when the API answered in an unexpected shape. */
export const UNKNOWN_ERROR = 'UNKNOWN_ERROR';

/**
 * Normalised transport error. Repositories translate every HTTP failure into
 * this shape so feature components can branch on `code`/`status` without
 * importing HTTP types.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetworkError(): boolean {
    return this.code === NETWORK_ERROR;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

function readEnvelope(body: unknown): { code?: string; message?: string } {
  if (typeof body !== 'object' || body === null) {
    return {};
  }
  const envelope = (body as ApiErrorEnvelope).error;
  if (typeof envelope !== 'object' || envelope === null) {
    return {};
  }
  return {
    code: typeof envelope.code === 'string' ? envelope.code : undefined,
    message: typeof envelope.message === 'string' ? envelope.message : undefined,
  };
}

/** Convert anything thrown by `HttpClient` into an {@link ApiError}. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return new ApiError(
        0,
        NETWORK_ERROR,
        'We could not reach the ClapOut API. Check your connection and try again.',
      );
    }
    const { code, message } = readEnvelope(error.error);
    return new ApiError(
      error.status,
      code ?? UNKNOWN_ERROR,
      message ?? error.message ?? 'Something went wrong. Please try again.',
    );
  }

  return new ApiError(
    0,
    UNKNOWN_ERROR,
    error instanceof Error ? error.message : 'Something went wrong. Please try again.',
  );
}
