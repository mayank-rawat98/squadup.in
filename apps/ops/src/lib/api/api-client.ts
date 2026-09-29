import type { SessionTokens } from '../auth/session.types';
import {
  ApiError,
  NETWORK_ERROR_MESSAGE,
  UNKNOWN_ERROR_MESSAGE,
} from './api-error';
import {
  APP_ORIGIN,
  APP_ORIGIN_HEADER,
  DEVICE_ID_HEADER,
  REFRESH_LOCK_NAME,
  REFRESH_PATH,
} from './api.constants';
import type { ApiEnvelope } from './api.types';

/*
 * The one way ops talks to the API. It owns the base URL, cookies, the auth
 * headers, the `{ success, data, message }` envelope and the refresh on 401,
 * so no screen reimplements any of them.
 *
 * The refresh token is an HttpOnly cookie scoped to /staff/auth, so this code
 * never sees it: a refresh is a bare POST that the browser adds the cookie to.
 *
 * Refresh tokens rotate, so two refreshes presenting the same cookie would
 * have the second refused. Within a tab, every request that meets a 401 waits
 * on one shared refresh. Across tabs, which share the cookie, the refresh runs
 * under a Web Lock: the second tab waits, then presents the cookie the first
 * one was just given.
 *
 * Only a request that carried an access token triggers a refresh. A 401 from
 * sign-in means "that didn't work", not "your token expired", and must reach
 * the screen as an error.
 */

const SESSION_EXPIRED_MESSAGE =
  'Your session has expired. Please sign in again.';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  /** Serialised as JSON. */
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/** What the client needs from the session store; injected so tests can fake it. */
export interface SessionPort {
  getAccessToken(): string | null;
  getDeviceId(): string | null;
  updateTokens(tokens: SessionTokens): void;
  clearSession(): void;
}

/** Runs `task` while no other tab runs one under the same name. */
export type RunExclusive = <T>(
  name: string,
  task: () => Promise<T>,
) => Promise<T>;

export interface ApiClientDeps {
  getBaseUrl: () => string;
  session: SessionPort;
  /** Runs once the session can't be renewed, after it has been cleared. */
  onSessionExpired: () => void;
  fetch?: typeof fetch;
  runExclusive?: RunExclusive;
}

export interface ApiClient {
  /** Resolves with the envelope's `data`. */
  request<T>(path: string, options?: RequestOptions): Promise<T>;
  /**
   * Swaps the refresh cookie for a new access token. Resolves false, without
   * clearing anything, when there is no session to renew.
   */
  refresh(): Promise<boolean>;
}

/*
 * Web Locks are in every browser ops supports. Where they're missing (tests,
 * an old browser) a tab still refreshes once at a time, just not in turn with
 * other tabs.
 */
const runWithWebLock: RunExclusive = (name, task) => {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  return locks ? locks.request(name, task) : task();
};

function messageFrom(body: unknown): string | null {
  if (!body || typeof body !== 'object' || !('message' in body)) return null;
  const { message } = body as { message: unknown };
  if (typeof message === 'string' && message) return message;
  if (Array.isArray(message) && typeof message[0] === 'string') {
    return message[0];
  }
  return null;
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function createApiClient({
  getBaseUrl,
  session,
  onSessionExpired,
  fetch: fetchImpl = (...args) => globalThis.fetch(...args),
  runExclusive = runWithWebLock,
}: ApiClientDeps): ApiClient {
  let refreshInFlight: Promise<boolean> | null = null;

  function buildHeaders(options: RequestOptions): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      [APP_ORIGIN_HEADER]: APP_ORIGIN,
      ...options.headers,
    };
    if (options.body !== undefined)
      headers['Content-Type'] = 'application/json';

    const accessToken = session.getAccessToken();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const deviceId = session.getDeviceId();
    if (deviceId) headers[DEVICE_ID_HEADER] = deviceId;

    return headers;
  }

  async function send(path: string, options: RequestOptions) {
    const headers = buildHeaders(options);
    // Outside the try: a missing base URL is a configuration error and must
    // say so, not pass itself off as a network failure.
    const url = `${getBaseUrl()}${path}`;
    try {
      const response = await fetchImpl(url, {
        method: options.method ?? 'GET',
        headers,
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        credentials: 'include',
        signal: options.signal,
      });
      return { response, sentToken: headers.Authorization ?? null };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
    }
  }

  async function refreshNow(): Promise<boolean> {
    try {
      const { response } = await send(REFRESH_PATH, { method: 'POST' });
      const body = (await readBody(
        response,
      )) as ApiEnvelope<SessionTokens> | null;
      if (!response.ok || !body?.success || !body.data?.accessToken) {
        return false;
      }
      session.updateTokens(body.data);
      return true;
    } catch {
      return false;
    }
  }

  function refreshOnce(): Promise<boolean> {
    refreshInFlight ??= runExclusive(REFRESH_LOCK_NAME, refreshNow).finally(
      () => {
        refreshInFlight = null;
      },
    );
    return refreshInFlight;
  }

  async function request<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const sent = await send(path, options);
    let { response } = sent;
    const { sentToken } = sent;

    if (response.status === 401 && sentToken && path !== REFRESH_PATH) {
      const expired = new ApiError(
        messageFrom(await readBody(response)) ?? SESSION_EXPIRED_MESSAGE,
        401,
      );
      const current = session.getAccessToken();
      // Signed out while this request was in flight: whoever cleared the
      // session has already handled the redirect.
      if (!current) throw expired;

      // Another request may already have renewed the token while this one
      // was in flight; then there is nothing to refresh, only to retry.
      const renewed =
        `Bearer ${current}` !== sentToken || (await refreshOnce());
      if (!renewed) {
        // Requests that failed together share the one failed refresh; only
        // the first to get here signs out and redirects.
        if (session.getAccessToken()) {
          session.clearSession();
          onSessionExpired();
        }
        throw expired;
      }
      ({ response } = await send(path, options));
    }

    const body = await readBody(response);
    if (!response.ok || (body as ApiEnvelope<T> | null)?.success === false) {
      throw new ApiError(
        messageFrom(body) ?? UNKNOWN_ERROR_MESSAGE,
        response.status,
      );
    }
    return ((body as ApiEnvelope<T> | null)?.data ?? null) as T;
  }

  return { request, refresh: refreshOnce };
}
