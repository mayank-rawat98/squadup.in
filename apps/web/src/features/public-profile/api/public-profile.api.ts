// The constants module, not the '@/lib/api' barrel, which would also load the
// browser session store into a server module.
import {
  APP_ORIGIN,
  APP_ORIGIN_HEADER,
  getApiBaseUrl,
} from '@/lib/api/api.constants';
import type { PublicProfile } from '../types/public-profile.types';

/*
 * Server-only: called from the /u/[username] page, so the profile is in the
 * first HTML (and its metadata in the <head>) without a session. The browser
 * API client doesn't fit here: it carries the signed-in user's token, and
 * this page has none.
 */

const REVALIDATE_SECONDS = 60;

/** The profile, or null when no visible account has that username. */
export async function getPublicProfile(
  username: string,
): Promise<PublicProfile | null> {
  const response = await fetch(
    `${getApiBaseUrl()}/users/public/${encodeURIComponent(username)}`,
    {
      headers: { Accept: 'application/json', [APP_ORIGIN_HEADER]: APP_ORIGIN },
      next: { revalidate: REVALIDATE_SECONDS },
    },
  );
  // 400 is a name that breaks the rules, so no account can have it.
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) {
    throw new Error(`Public profile request failed with ${response.status}`);
  }
  const body = (await response.json()) as { data: PublicProfile };
  return body.data;
}
