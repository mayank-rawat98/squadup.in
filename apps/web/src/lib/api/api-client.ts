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
  REFRESH_PATH,
} from './api.constants';
import type { ApiEnvelope } from './api.types';

/*
 * The one way the web app talks to the API. It owns the base URL, cookies,
 * the auth headers, the `{ success, data, message }` envelope and the refresh
 * on 401, so no screen reimplements any of them.
 *
 * Refresh is single-flight. Refresh tokens rotate, so two refreshes racing
 * each other would have the second one present a token the first had already
 * spent, and the API would end the session. Every request that meets a 401
 * waits on the same promise instead.
 *
 * Only a request that carried an access token triggers a refresh. A 401 from
 * sign-in or from the 2FA step means "that didn't work", not "your token
 * expired", and must reach the screen as an error.
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

export interface ApiClientDeps {
  getBaseUrl: () => string;
  session: SessionPort;
  /** Runs once the session can't be renewed, after it has been cleared. */
  onSessionExpired: () => void;
  fetch?: typeof fetch;
}

export interface ApiClient {
  /** Resolves with the envelope's `data`. */
  request<T>(path: string, options?: RequestOptions): Promise<T>;
  /** Resolves with the whole envelope, for callers that show `message`. */
  requestEnvelope<T>(
    path: string,
    options?: RequestOptions,
  ): Promise<ApiEnvelope<T>>;
}

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
    try {
      const response = await fetchImpl(`${getBaseUrl()}${path}`, {
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

  async function refresh(): Promise<boolean> {
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
    refreshInFlight ??= refresh().finally(() => {
      refreshInFlight = null;
    });
    return refreshInFlight;
  }

  async function requestEnvelope<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<ApiEnvelope<T>> {
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

    return (body ?? {
      success: true,
      data: null,
      message: '',
    }) as ApiEnvelope<T>;
  }

  return {
    requestEnvelope,
    async request<T>(path: string, options?: RequestOptions) {
      return (await requestEnvelope<T>(path, options)).data;
    },
  };
}
