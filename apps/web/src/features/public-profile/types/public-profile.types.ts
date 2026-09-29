/** `GET /users/public/:username`. Only what the API makes public. */
export interface PublicProfile {
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  /** ISO 8601. */
  joinedAt: string;
}
