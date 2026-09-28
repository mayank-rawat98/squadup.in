import {
  clearSession,
  getAccessToken,
  getDeviceId,
  updateTokens,
} from '../auth/session-store';
import { createApiClient } from './api-client';
import { getApiBaseUrl } from './api.constants';
import { buildLoginHref } from '../auth/redirect';

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

export { ApiError, getErrorMessage, isApiError } from './api-error';
export type { ApiClient, RequestOptions } from './api-client';
export type { ApiEnvelope, Paginated } from './api.types';
