import {
  DEFAULT_REDIRECT,
  buildLoginHref,
  isSafeRedirect,
  peekRedirect,
  rememberRedirect,
  sanitizeRedirect,
  takeRedirect,
} from './redirect';

describe('sanitizeRedirect', () => {
  it.each(['/dashboard', '/settings/security', '/arenas/42?tab=live#top', '/'])(
    'keeps the same-site path %s',
    (path) => {
      expect(sanitizeRedirect(path)).toBe(path);
    },
  );

  it.each([
    ['a protocol-relative URL', '//evil.com'],
    ['a protocol-relative URL with a path', '//evil.com/dashboard'],
    ['a backslash URL', '/\\evil.com'],
    ['an absolute URL', 'https://evil.com'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a relative path', 'dashboard'],
    ['a tab that browsers strip', '/\t/evil.com'],
    ['a newline that browsers strip', '/\n/evil.com'],
    ['an empty string', ''],
  ])('falls back to the dashboard for %s', (_label, value) => {
    expect(sanitizeRedirect(value)).toBe(DEFAULT_REDIRECT);
  });

  it.each([null, undefined, 42])(
    'falls back to the dashboard for %p',
    (value) => {
      expect(sanitizeRedirect(value)).toBe(DEFAULT_REDIRECT);
    },
  );

  it('agrees with isSafeRedirect', () => {
    expect(isSafeRedirect('/dashboard')).toBe(true);
    expect(isSafeRedirect('//evil.com')).toBe(false);
  });
});

describe('the parked redirect', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('survives until it is taken, then falls back to the dashboard', () => {
    rememberRedirect('/settings/security');

    expect(peekRedirect()).toBe('/settings/security');
    expect(takeRedirect()).toBe('/settings/security');
    expect(takeRedirect()).toBe(DEFAULT_REDIRECT);
  });

  it('never parks an unsafe target', () => {
    rememberRedirect('//evil.com');

    expect(takeRedirect()).toBe(DEFAULT_REDIRECT);
  });

  it('clears an earlier target when a later visit has none', () => {
    rememberRedirect('/settings/security');
    rememberRedirect(null);

    expect(takeRedirect()).toBe(DEFAULT_REDIRECT);
  });

  it('falls back to the dashboard when nothing was parked', () => {
    expect(takeRedirect()).toBe(DEFAULT_REDIRECT);
  });
});

describe('buildLoginHref', () => {
  it('carries the page the user was on', () => {
    expect(buildLoginHref('/settings/security?tab=2fa')).toBe(
      '/auth/login?redirect=%2Fsettings%2Fsecurity%3Ftab%3D2fa',
    );
  });

  it.each([undefined, '/', '/auth/2fa', '//evil.com'])(
    'drops a redirect that is missing, pointless or unsafe: %p',
    (value) => {
      expect(buildLoginHref(value)).toBe('/auth/login');
    },
  );
});
