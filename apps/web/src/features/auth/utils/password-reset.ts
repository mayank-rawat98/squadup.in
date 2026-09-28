import { isApiError } from '@/lib/api';

/*
 * Whether a failed "send me a reset link" should still read as sent.
 *
 * The page must not reveal which addresses have accounts, but the API answers
 * an unknown address with 404 (and a failed send with 400). Those look like
 * success to the user. A rate limit, a network failure or a server error
 * reveal nothing about the address, and hiding them would leave someone
 * waiting for an email that isn't coming, so those are shown.
 */
export function looksSentAnyway(error: unknown): boolean {
  return isApiError(error) && (error.status === 400 || error.status === 404);
}
