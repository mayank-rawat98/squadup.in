import {
  clearSession,
  getSessionSnapshot,
  resetSessionStoreForTests,
  subscribeToSession,
  updateTokens,
} from './session-store';

const TOKENS = { accessToken: 'token-1', deviceId: 'device-1', expiresIn: 900 };
const KEY = 'squadup-ops.session';

describe('session store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    resetSessionStoreForTests();
  });

  it('starts unknown in a tab that has no session of its own', () => {
    expect(getSessionSnapshot()).toEqual({ status: 'unknown', tokens: null });
  });

  it('keeps the session across a reload of the tab', () => {
    updateTokens(TOKENS);
    resetSessionStoreForTests();

    expect(getSessionSnapshot()).toEqual({
      status: 'signed-in',
      tokens: TOKENS,
    });
  });

  it('never writes the session to localStorage', () => {
    updateTokens(TOKENS);

    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(window.sessionStorage.getItem(KEY)).not.toBeNull();
  });

  it('is signed out, with nothing stored, once cleared', () => {
    updateTokens(TOKENS);
    clearSession();

    expect(getSessionSnapshot()).toEqual({
      status: 'signed-out',
      tokens: null,
    });
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it('ignores a stored session that is malformed', () => {
    window.sessionStorage.setItem(KEY, JSON.stringify({ accessToken: 1 }));

    expect(getSessionSnapshot().status).toBe('unknown');
  });

  it('returns the same snapshot until something changes', () => {
    const first = getSessionSnapshot();

    expect(getSessionSnapshot()).toBe(first);
    updateTokens(TOKENS);
    expect(getSessionSnapshot()).not.toBe(first);
  });

  it('notifies subscribers of each change, and not of a repeated sign-out', () => {
    const listener = jest.fn();
    subscribeToSession(listener);

    updateTokens(TOKENS);
    clearSession();
    clearSession();

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
