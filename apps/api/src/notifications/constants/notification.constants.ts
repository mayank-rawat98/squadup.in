/**
 * Notification system constants
 * Centralized configuration for the notification module
 */

// ─── Category Enum ─────────────────────────────────────────────
export enum NotificationCategory {
  ALL = 'ALL',
  JOB = 'JOB',
  TASK = 'TASK',
  LEAVE = 'LEAVE',
  INTERVIEW = 'INTERVIEW',
  SYSTEM = 'SYSTEM',
  CAMPAIGN = 'CAMPAIGN',
  EMAIL = 'EMAIL',
  CRM = 'CRM',
  FORM = 'FORM',
  SECURITY = 'SECURITY',
  TEMPLATE = 'TEMPLATE',
  MARKETPLACE = 'MARKETPLACE',
  MARKETING = 'MARKETING',
  BILLING = 'BILLING',
}

// ─── Entity Type Enum ──────────────────────────────────────────
export enum NotificationEntityType {
  JOB = 'JOB',
  TASK = 'TASK',
  LEAVE = 'LEAVE',
  INTERVIEW = 'INTERVIEW',
  APPLICATION = 'APPLICATION',
  CAMPAIGN = 'CAMPAIGN',
  CONTACT = 'CONTACT',
  LIST = 'LIST',
  EMAIL = 'EMAIL',
  DOMAIN = 'DOMAIN',
  USER = 'USER',
  FORM = 'FORM',
  TEMPLATE = 'TEMPLATE',
  TEMPLATE_LISTING = 'TEMPLATE_LISTING',
  SETTING = 'SETTING',
  DEVICE = 'DEVICE',
  AUDIENCE = 'AUDIENCE',
  COMPANY = 'COMPANY',
  FOLDER = 'FOLDER',
  SUBSCRIPTION = 'SUBSCRIPTION',
  INVOICE = 'INVOICE',
}

// ─── Priority Enum ─────────────────────────────────────────────
export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// ─── Delivery Status ───────────────────────────────────────────
export enum DeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

// ─── Email Queue Status ────────────────────────────────────────
export enum EmailQueueStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
}

// ─── Redis Key Patterns ────────────────────────────────────────
export const NOTIFICATION_REDIS_KEYS = {
  UNREAD_COUNT: (userId: string) => `notif:unread_count:${userId}`,
  UNREAD_NOTIFICATIONS: (userId: string) => `notif:unread:${userId}`,
  USER_PREFERENCES: (userId: string) => `notif:prefs:${userId}`,
  TEMPLATES: () => `notif:templates`,
} as const;

// ─── Cache TTLs (in seconds) ───────────────────────────────────
export const NOTIFICATION_CACHE_TTL = {
  UNREAD_COUNT: 10,
  UNREAD_NOTIFICATIONS: 30,
  USER_PREFERENCES: 60,
  TEMPLATES: 300,
} as const;

// ─── Email Queue Config ────────────────────────────────────────
export const EMAIL_QUEUE_CONFIG = {
  MAX_ATTEMPTS: 3,
  BATCH_SIZE: 100,
  CRON_INTERVAL: '*/5 * * * *', // Every 5 minutes
  RETRY_DELAYS: [1000, 5000, 15000], // 1s, 5s, 15s
} as const;

// ─── WebSocket Events ──────────────────────────────────────────
export const WS_EVENTS = {
  NOTIFICATION: 'notification',
  UNREAD_COUNT: 'unread-count',
  MARK_AS_READ: 'mark-as-read',
  MARK_AS_READ_ACK: 'mark-as-read-ack',
  MARK_ALL_READ: 'mark-all-read',
  // Real-time mailbox refresh signal: tells the client a sender's mailbox
  // changed (new inbound mail, or a cross-device folder mutation) so it can
  // invalidate its cached lists without a hard reload.
  MAILBOX_CHANGED: 'mailbox:changed',
  PING: 'ping',
  PONG: 'pong',
} as const;
