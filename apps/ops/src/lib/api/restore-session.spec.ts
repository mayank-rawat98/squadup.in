import { apiClient, restoreSession } from '.';
import {
  getSessionSnapshot,
  resetSessionStoreForTests,
  updateTokens,
} from '../auth/session-store';

const TOKENS = { accessToken: 'token-1', deviceId: 'device-1', expiresIn: 900 };

describe('restoreSession', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    resetSessionStoreForTests();
  });

  afterEach(() => jest.restoreAllMocks());

  it('signs the tab in when the refresh cookie is still good', async () => {
    jest.spyOn(apiClient, 'refresh').mockImplementation(async () => {
      updateTokens(TOKENS);
      return true;
    });

    await restoreSession();

    expect(getSessionSnapshot().status).toBe('signed-in');
  });

  it('marks the tab signed out when there is nothing to renew', async () => {
    jest.spyOn(apiClient, 'refresh').mockResolvedValue(false);

    await restoreSession();

    expect(getSessionSnapshot().status).toBe('signed-out');
  });

  it('asks the API once for guards that ask together', async () => {
    const refresh = jest.spyOn(apiClient, 'refresh').mockResolvedValue(false);

    await Promise.all([restoreSession(), restoreSession()]);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does nothing for a tab that already has a session', async () => {
    const refresh = jest.spyOn(apiClient, 'refresh');
    updateTokens(TOKENS);

    await restoreSession();

    expect(refresh).not.toHaveBeenCalled();
  });
});
