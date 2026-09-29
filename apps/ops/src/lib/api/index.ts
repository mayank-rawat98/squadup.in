import {
  clearSession,
  getAccessToken,
  getDeviceId,
  getSessionSnapshot,
  updateTokens,
} from '../auth/session-store';
import { buildLoginHref } from '../auth/redirect';
import { createApiClient } from './api-client';
import { getApiBaseUrl } from './api.constants';

/*
 * The app's single client. Screens call the per-resource functions in their
 * feature's `api/` folder, which call this.
 */
export const apiClient = createApiClient({
  getBaseUrl: getApiBaseUrl,
  session: { getAccessToken, getDeviceId, updateTokens, clearSession },
  onSessionExpired: () => {
    if (typeof window === 'undefined') return;
    const { pathname, search } = window.location;
    window.location.assign(buildLoginHref(`${pathname}${search}`));
  },
});

let restoring: Promise<void> | null = null;

/**
 * Settles an `unknown` session: renews it from the refresh cookie when that is
 * still good, and marks the tab signed out otherwise. Called by the guards on
 * a tab that has no session of its own yet, such as a new tab.
 */
export function restoreSession(): Promise<void> {
  if (getSessionSnapshot().status !== 'unknown') return Promise.resolve();
  restoring ??= apiClient
    .refresh()
    .then((renewed) => {
      if (!renewed) clearSession();
    })
    .finally(() => {
      restoring = null;
    });
  return restoring;
}

export { ApiError, getErrorMessage, isApiError } from './api-error';
export type { ApiClient, RequestOptions } from './api-client';
export type { ApiEnvelope } from './api.types';
