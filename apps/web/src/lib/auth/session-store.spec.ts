import {
  clearSession,
  getSession,
  resetSessionStoreForTests,
  setPendingRememberMe,
  startSession,
  subscribeToSession,
  takePendingRememberMe,
  updateTokens,
} from './session-store';

const TOKENS = { accessToken: 'token-1', deviceId: 'device-1', expiresIn: 900 };
const KEY = 'squadup.session';

/*
 * A "browser restart" is modelled as: sessionStorage is gone, localStorage
 * survives, and the in-memory copy is gone.
 */
function restartBrowser() {
  window.sessionStorage.clear();
  resetSessionStoreForTests();
}

describe('session store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    resetSessionStoreForTests();
  });

  it('keeps a remembered session across a browser restart', () => {
    startSession(TOKENS, { rememberMe: true });

    restartBrowser();

    expect(getSession()).toEqual({ ...TOKENS, persistence: 'local' });
  });

  it('forgets a session that was not remembered when the browser restarts', () => {
    startSession(TOKENS, { rememberMe: false });

    restartBrowser();

    expect(getSession()).toBeNull();
  });

  it('keeps a session that was not remembered across a reload', () => {
    startSession(TOKENS, { rememberMe: false });

    resetSessionStoreForTests();

    expect(getSession()).toEqual({ ...TOKENS, persistence: 'session' });
  });

  it('keeps the storage chosen at sign-in when tokens are refreshed', () => {
    startSession(TOKENS, { rememberMe: true });

    updateTokens({ ...TOKENS, accessToken: 'token-2' });

    expect(getSession()?.persistence).toBe('local');
    expect(
      JSON.parse(window.localStorage.getItem(KEY) ?? '{}').accessToken,
    ).toBe('token-2');
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it('removes the session from both storages when cleared', () => {
    startSession(TOKENS, { rememberMe: true });

    clearSession();

    expect(getSession()).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it('ignores a stored session that is malformed', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ accessToken: 1 }));

    expect(getSession()).toBeNull();
  });

  it('notifies subscribers when the session changes', () => {
    const listener = jest.fn();
    subscribeToSession(listener);

    startSession(TOKENS, { rememberMe: false });
    clearSession();

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('parks the remember-me choice for the 2FA step and forgets it once read', () => {
    setPendingRememberMe(true);

    expect(takePendingRememberMe()).toBe(true);
    expect(takePendingRememberMe()).toBe(false);
  });
});
