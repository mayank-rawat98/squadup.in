import type { Request, Response as ExpressResponse } from 'express';
export function getClientIp(req: Request): string {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length > 0) return xf.split(',')[0].trim();
  return (req.socket.remoteAddress ?? 'unknown').toString();
}

/**
 * The refresh cookie is always persistent now: a plain login stays signed in for
 * the default window (7 days) and a remember-me / social login for the longer
 * one (30 days), both surviving browser restarts. `ttlSeconds` is the resolved
 * refresh lifetime for the session and must match the refresh JWT `exp` and its
 * Redis record so cookie, token and server record expire together.
 */
export function setRefreshCookie(
  res: ExpressResponse,
  value: string,
  ttlSeconds: number,
): void {
  res.cookie('refresh', value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ttlSeconds * 1000,
  });
}

export function clearRefreshCookie(res: ExpressResponse): void {
  res.cookie('refresh', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function set2FASessionId(res: ExpressResponse, value: string) {
  res.cookie('2fa_session', value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 5 * 60 * 1000,
  });
}

export const clear2FASessionId = (res: ExpressResponse) => {
  res.cookie('2fa_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
};

export function maskIp(ip: string): string {
  if (!ip) return 'unknown';

  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`;
    }
    return ip; // fallback
  }

  // IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':');
    const shown = parts.slice(0, 3).join(':');
    return `${shown}:****:****:****:****`;
  }

  return ip;
}
