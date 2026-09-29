/**
 * @jest-environment node
 */
import { ApiError, NETWORK_ERROR_MESSAGE } from './api-error';
import { createApiClient, type SessionPort } from './api-client';
import type { SessionTokens } from '../auth/session.types';

const BASE_URL = 'http://api.test/api/v1';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fakeSession(accessToken: string | null = 'old-token'): SessionPort & {
  tokens: SessionTokens | null;
  cleared: number;
} {
  const state = {
    tokens: accessToken
      ? { accessToken, deviceId: 'device-1', expiresIn: 900 }
      : null,
    cleared: 0,
    getAccessToken: () => state.tokens?.accessToken ?? null,
    getDeviceId: () => state.tokens?.deviceId ?? null,
    updateTokens: (tokens: SessionTokens) => {
      state.tokens = tokens;
    },
    clearSession: () => {
      state.tokens = null;
      state.cleared += 1;
    },
  };
  return state;
}

function setup(
  handler: (url: string, init: RequestInit) => Promise<Response>,
  session = fakeSession(),
) {
  const fetchMock = jest.fn(handler);
  const onSessionExpired = jest.fn();
  const runExclusive = jest.fn(<T>(_name: string, task: () => Promise<T>) =>
    task(),
  );
  const client = createApiClient({
    getBaseUrl: () => BASE_URL,
    session,
    onSessionExpired,
    fetch: fetchMock as unknown as typeof fetch,
    runExclusive,
  });
  const callsTo = (path: string) =>
    fetchMock.mock.calls.filter(([url]) => url === `${BASE_URL}${path}`);
  return {
    client,
    fetchMock,
    onSessionExpired,
    session,
    callsTo,
    runExclusive,
  };
}

const REFRESHED = {
  success: true,
  data: { accessToken: 'new-token', deviceId: 'device-1', expiresIn: 900 },
  message: 'ok',
};

const header = (init: RequestInit, name: string) =>
  (init.headers as Record<string, string>)[name];

describe('createApiClient', () => {
  it('sends cookies, the bearer token, the device id and the app origin', async () => {
    const { client, fetchMock } = setup(async () =>
      json(200, { success: true, data: { id: 'u1' }, message: 'ok' }),
    );

    await client.request('/staff/me');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/staff/me`);
    expect(init.credentials).toBe('include');
    expect(header(init, 'Authorization')).toBe('Bearer old-token');
    expect(header(init, 'x-device-id')).toBe('device-1');
    expect(header(init, 'x-app-origin')).toBe('ops-dashboard');
  });

  it('leaves out the auth headers when signed out', async () => {
    const { client, fetchMock } = setup(
      async () => json(200, { success: true, data: null, message: 'ok' }),
      fakeSession(null),
    );

    await client.request('/staff/auth/login', { method: 'POST', body: {} });

    const [, init] = fetchMock.mock.calls[0];
    expect(header(init, 'Authorization')).toBeUndefined();
    expect(header(init, 'x-device-id')).toBeUndefined();
    expect(header(init, 'Content-Type')).toBe('application/json');
  });

  it('unwraps the envelope to its data', async () => {
    const { client } = setup(async () =>
      json(200, { success: true, data: { id: 'u1' }, message: 'ok' }),
    );

    await expect(client.request('/staff/me')).resolves.toEqual({ id: 'u1' });
  });

  it("throws the API's message and status on an error", async () => {
    const { client } = setup(async () =>
      json(409, {
        success: false,
        statusCode: 409,
        message: 'A record with email already exists.',
      }),
    );

    const error = await client
      .request('/staff/auth/login', { method: 'POST', body: {} })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe(
      'A record with email already exists.',
    );
    expect((error as ApiError).status).toBe(409);
  });

  it('shows the first validation message when the API returns several', async () => {
    const { client } = setup(async () =>
      json(400, {
        success: false,
        message: ['email must be an email', 'password is too short'],
      }),
    );

    await expect(client.request('/staff/auth/login')).rejects.toThrow(
      'email must be an email',
    );
  });

  it('turns a failed fetch into a network error', async () => {
    const { client } = setup(async () => {
      throw new TypeError('Failed to fetch');
    });

    const error = await client.request('/staff/me').catch((e: unknown) => e);

    expect((error as ApiError).message).toBe(NETWORK_ERROR_MESSAGE);
    expect((error as ApiError).status).toBe(0);
  });

  it('refreshes exactly once for several requests that hit 401 together', async () => {
    const { client, callsTo, session } = setup(async (url, init) => {
      if (url.endsWith('/staff/auth/refresh')) {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return json(200, {
          success: true,
          data: {
            accessToken: 'new-token',
            deviceId: 'device-1',
            expiresIn: 900,
          },
          message: 'ok',
        });
      }
      return header(init, 'Authorization') === 'Bearer new-token'
        ? json(200, { success: true, data: url, message: 'ok' })
        : json(401, { success: false, message: 'Your session has expired.' });
    });

    const results = await Promise.all([
      client.request('/a'),
      client.request('/b'),
      client.request('/c'),
    ]);

    expect(callsTo('/staff/auth/refresh')).toHaveLength(1);
    expect(results).toEqual([
      `${BASE_URL}/a`,
      `${BASE_URL}/b`,
      `${BASE_URL}/c`,
    ]);
    expect(session.tokens?.accessToken).toBe('new-token');
  });

  it('retries without refreshing when the token was renewed meanwhile', async () => {
    const session = fakeSession();
    const { client, callsTo } = setup(async (_url, init) => {
      if (header(init, 'Authorization') === 'Bearer old-token') {
        session.updateTokens({
          accessToken: 'new-token',
          deviceId: 'device-1',
          expiresIn: 900,
        });
        return json(401, { success: false, message: 'expired' });
      }
      return json(200, { success: true, data: 'ok', message: 'ok' });
    }, session);

    await expect(client.request('/a')).resolves.toBe('ok');
    expect(callsTo('/staff/auth/refresh')).toHaveLength(0);
  });

  it('clears the session and reports expiry when the refresh fails', async () => {
    const { client, onSessionExpired, session } = setup(async (url) =>
      url.endsWith('/staff/auth/refresh')
        ? json(401, { success: false, message: 'Invalid token' })
        : json(401, { success: false, message: 'Your session has expired.' }),
    );

    const results = await Promise.allSettled([
      client.request('/a'),
      client.request('/b'),
    ]);

    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(session.tokens).toBeNull();
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('does not refresh a 401 from a request sent without a token', async () => {
    const { client, callsTo, onSessionExpired } = setup(
      async () =>
        json(401, {
          success: false,
          message: 'Invalid credentials',
        }),
      fakeSession(null),
    );

    await expect(
      client.request('/staff/auth/login', { method: 'POST', body: {} }),
    ).rejects.toThrow('Invalid credentials');
    expect(callsTo('/staff/auth/refresh')).toHaveLength(0);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('sends other bodies as JSON', async () => {
    const { client, fetchMock } = setup(async () =>
      json(200, { success: true, data: null, message: '' }),
    );

    await client.request('/admin-ops/email-templates/user/welcome', {
      method: 'PUT',
      body: { templateId: 'tpl_1' },
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBe('{"templateId":"tpl_1"}');
    expect(header(init, 'Content-Type')).toBe('application/json');
  });

  it('resolves a 204 without a body', async () => {
    const { client } = setup(async () => new Response(null, { status: 204 }));

    await expect(
      client.request('/staff/auth/logout', { method: 'POST' }),
    ).resolves.toBeNull();
  });

  it('refreshes under the cross-tab lock', async () => {
    const { client, runExclusive } = setup(async (url, init) =>
      url.endsWith('/staff/auth/refresh')
        ? json(200, REFRESHED)
        : header(init, 'Authorization') === 'Bearer new-token'
          ? json(200, { success: true, data: 'ok', message: 'ok' })
          : json(401, { success: false, message: 'expired' }),
    );

    await client.request('/a');

    expect(runExclusive).toHaveBeenCalledTimes(1);
    expect(runExclusive.mock.calls[0][0]).toBe('squadup-ops.refresh');
  });

  describe('refresh', () => {
    it('renews the session from the cookie alone, with no access token', async () => {
      const { client, session, fetchMock } = setup(
        async () => json(200, REFRESHED),
        fakeSession(null),
      );

      await expect(client.refresh()).resolves.toBe(true);
      expect(session.tokens?.accessToken).toBe('new-token');
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/staff/auth/refresh`);
      expect(init.credentials).toBe('include');
    });

    it('resolves false without clearing or redirecting when the cookie is refused', async () => {
      const { client, session, onSessionExpired } = setup(
        async () => json(401, { success: false, message: 'Session ended' }),
        fakeSession(null),
      );

      await expect(client.refresh()).resolves.toBe(false);
      expect(session.cleared).toBe(0);
      expect(onSessionExpired).not.toHaveBeenCalled();
    });

    it('resolves false when the API cannot be reached', async () => {
      const { client } = setup(async () => {
        throw new TypeError('Failed to fetch');
      }, fakeSession(null));

      await expect(client.refresh()).resolves.toBe(false);
    });
  });
});
