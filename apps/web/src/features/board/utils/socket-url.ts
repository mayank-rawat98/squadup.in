import { BOARDS_NAMESPACE } from '../constants/board.constant';

/**
 * The gateway sits on the API's origin, not under its `/api/v1` path:
 * `https://api.squadup.in/api/v1` → `https://api.squadup.in/boards`.
 */
export function boardsSocketUrl(apiBaseUrl: string): string {
  return `${new URL(apiBaseUrl).origin}${BOARDS_NAMESPACE}`;
}
