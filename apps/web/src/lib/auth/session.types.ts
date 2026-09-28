/** What sign-in, 2FA verification and refresh all return. */
export interface SessionTokens {
  accessToken: string;
  deviceId: string;
  /** Access token lifetime, in seconds. */
  expiresIn: number;
}

/**
 * Where the session is mirrored. `local` survives a browser restart ("Remember
 * me"); `session` ends with the tab.
 */
export type SessionPersistence = 'local' | 'session';

export interface Session extends SessionTokens {
  persistence: SessionPersistence;
}
