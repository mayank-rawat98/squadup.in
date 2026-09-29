/*
 * The envelope every API response arrives in. Errors add `statusCode`, and
 * `message` is written for users, so it's what the UI shows.
 */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string | string[];
  statusCode?: number;
}
