import type { CookieOptions, Response } from 'express';
import { isProduction } from '../../config';
import {
  STAFF_REFRESH_COOKIE,
  STAFF_REFRESH_COOKIE_PATH,
} from '../constants/staff.constants';

/*
 * `strict` is enough: the ops console and the API share a site (ops. and api.
 * under one domain, or two localhost ports), so the browser still sends the
 * cookie on the console's own requests, and never on a request another site
 * starts.
 */
function options(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: STAFF_REFRESH_COOKIE_PATH,
    maxAge: maxAgeMs,
  };
}

/** `ttlSeconds` must match the refresh token's `exp` and its Redis record. */
export function setStaffRefreshCookie(
  res: Response,
  token: string,
  ttlSeconds: number,
): void {
  res.cookie(STAFF_REFRESH_COOKIE, token, options(ttlSeconds * 1000));
}

export function clearStaffRefreshCookie(res: Response): void {
  res.cookie(STAFF_REFRESH_COOKIE, '', options(0));
}
