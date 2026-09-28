/*
 * Thrown for every failed request, carrying the API's own message so a screen
 * can show it as is. `status` is 0 when the request never reached the API.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const NETWORK_ERROR_MESSAGE =
  "We couldn't reach SquadUp. Check your connection and try again.";

export const UNKNOWN_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** The message to put in front of a user for any thrown value. */
export function getErrorMessage(error: unknown): string {
  return isApiError(error) ? error.message : UNKNOWN_ERROR_MESSAGE;
}
