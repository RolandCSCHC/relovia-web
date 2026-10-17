import { ApiError } from '../api/relovia-client';

/** The first field message the API returned, or the error title, or the fallback. */
export function failureMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  return Object.values(error.fields)[0] ?? error.message;
}
