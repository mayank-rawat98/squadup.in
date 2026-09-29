/*
 * Shapes checked against apps/api: `GET /auth/user-devices` (the Redis device
 * records) and the `auth/email-change/*` responses. Only what the web app
 * reads is typed.
 */

/** One signed-in device. The API fills unknown fields with `"unknown"`. */
export interface UserDevice {
  deviceId: string;
  /** Epoch milliseconds. */
  lastSeen: number;
  createdAt: number;
  ipMask: string;
  city: string;
  country: string;
  deviceName: string;
  deviceType: string;
  deviceOs: string;
}

/** `GET /auth/email-change/pending`: an unconfirmed change, or null. */
export interface PendingEmailChange {
  newEmail: string;
  /** ISO 8601. */
  expiresAt: string;
  attemptsRemaining: number;
}

export interface EmailChangeRequest {
  newEmail: string;
  password?: string;
  /** Authenticator code, needed when the authenticator is on. */
  totp?: string;
  /** Code sent to the current email, for accounts without a password. */
  preauthOtp?: string;
}

/** `GET /users/username-availability`. */
export interface UsernameAvailability {
  username: string;
  available: boolean;
  reason: 'reserved' | 'taken' | null;
}
