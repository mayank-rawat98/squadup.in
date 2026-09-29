/** What sign-in and refresh both return. */
export interface SessionTokens {
  accessToken: string;
  deviceId: string;
  /** Access token lifetime, in seconds. */
  expiresIn: number;
}
