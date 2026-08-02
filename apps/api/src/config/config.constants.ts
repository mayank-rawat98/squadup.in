import { HelmetOptions } from 'helmet';
import { allowedOrigins, isProduction } from '.';

export const CORS_CONFIG = {
  origin: allowedOrigins,
  methods: ['GET', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'x-device-id',
    'x-org-id',
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'x-app-origin',
  ],
  credentials: true,
};

export const HELMET_CONFIG: HelmetOptions = {
  contentSecurityPolicy: isProduction
    ? {
        directives: {
          defaultSrc: ["'self'"],
          // The API serves only JSON and a few no-script HTML pages (e.g. the
          // unsubscribe confirmation), so inline scripts are never needed here.
          // Dropping 'unsafe-inline' restores CSP's core XSS protection
          // (injected inline <script> no longer executes). The SPA is served by
          // the separate web app and sets its own CSP.
          scriptSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          // Only the origins this API's own pages talk to. The mailtr email API
          // is called server-side, which CSP does not govern, so it is
          // deliberately absent — add it back only if browser code ever calls a
          // provider directly.
          connectSrc: ["'self'", ...allowedOrigins],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: [],
        },
      }
    : false, // Disable CSP in development
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: isProduction
    ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      }
    : false,
};
