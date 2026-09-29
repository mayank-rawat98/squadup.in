/*
 * Shapes checked against apps/api notifications: the list items from
 * `GET /notifications` (one row per recipient) and the socket events.
 */

export interface AppNotification {
  /** The recipient row id, which `POST /notifications/:id/read` takes. */
  id: string;
  title: string;
  message: string;
  category: string;
  /** An app path such as `/dashboard`, or null. */
  actionUrl: string | null;
  isRead: boolean;
  /** ISO 8601. */
  createdAt: string;
}
