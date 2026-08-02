export const REDIS_MAIL_KEYS = {
  EMAIL_VERIFICATION: (email: string) => `mail:verify:${email}`,
  PASSWORD_RESET: (email: string) => `mail:reset_password:${email}`,
};
export enum EMAIL_FINGERPRINT_PURPOSE {
  EMAIL_VERIFICATION = 'email_verification',
  RESET_PASSWORD = 'reset_password',
}
export enum EMAIL_TYPE_ENUM {
  CONTACT_US = 'contact_us',
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
  SENDER_EMAIL_OTP = 'sender_email_otp',
  EMAIL_CHANGE_OTP = 'email_change_otp',
  EMAIL_CHANGE_NOTICE = 'email_change_notice',
  TWO_FACTOR_OTP = 'two_factor_otp',
  AUTHENTICATOR_DISABLE_OTP = 'authenticator_disable_otp',
  SUPPORT = 'support',
  GRIEVANCE = 'grievance',
  NEWSLETTER = 'newsletter',
  FOLLOW_UP = 'follow_up',
  UNSUBSCRIBE_NEWSLETTER = 'unsubscribe_newsletter',
  CAREER = 'career',
  ORG_INVITE = 'org_invite',
  ACCOUNT_SUSPENDED = 'account_suspended',
}
export enum FOLLOW_UP_EMAIL_TYPE {
  IN_PROGRESS = 'inProgress',
  CLOSED = 'closed',
  NEED_MORE_INFO = 'needMoreInfo',
  RESOLVED = 'resolved',
}

/**
 * Who a given send is addressed to. The same functionality can have two
 * distinct mailtr templates — e.g. CONTACT_US mails both the submitter (USER)
 * and the ops inbox (ADMIN) — so audience is part of the mapping key.
 */
export enum EMAIL_AUDIENCE {
  USER = 'user',
  ADMIN = 'admin',
}

export const FINGERPRINT_KEY_MAP: Record<
  EMAIL_FINGERPRINT_PURPOSE,
  (email: string) => string
> = {
  [EMAIL_FINGERPRINT_PURPOSE.EMAIL_VERIFICATION]:
    REDIS_MAIL_KEYS.EMAIL_VERIFICATION,
  [EMAIL_FINGERPRINT_PURPOSE.RESET_PASSWORD]: REDIS_MAIL_KEYS.PASSWORD_RESET,
};

/**
 * Every (emailType, audience) pair the application can send. Templates
 * themselves live in mailtr; this is only the catalogue an admin configures a
 * `templateId` against, plus the human label shown in the ops dashboard.
 *
 * Adding a new transactional email = add an entry here, then set its mailtr
 * templateId from the ops dashboard. Nothing else in the code needs to change.
 */
export const EMAIL_TEMPLATE_CATALOGUE: ReadonlyArray<{
  emailType: string;
  audience: EMAIL_AUDIENCE;
  label: string;
}> = [
  // ── User-facing ─────────────────────────────────────────────────────────
  {
    emailType: EMAIL_TYPE_ENUM.WELCOME,
    audience: EMAIL_AUDIENCE.USER,
    label: 'Welcome / verify email on registration',
  },
  {
    emailType: EMAIL_TYPE_ENUM.EMAIL_VERIFICATION,
    audience: EMAIL_AUDIENCE.USER,
    label: 'Verify email address',
  },
  {
    emailType: EMAIL_TYPE_ENUM.PASSWORD_RESET,
    audience: EMAIL_AUDIENCE.USER,
    label: 'Reset password',
  },
  {
    emailType: EMAIL_TYPE_ENUM.SENDER_EMAIL_OTP,
    audience: EMAIL_AUDIENCE.USER,
    label: 'Sender email verification OTP',
  },
  {
    emailType: EMAIL_TYPE_ENUM.EMAIL_CHANGE_OTP,
    audience: EMAIL_AUDIENCE.USER,
    label: 'Confirm new login email',
  },
  {
    emailType: EMAIL_TYPE_ENUM.EMAIL_CHANGE_NOTICE,
    audience: EMAIL_AUDIENCE.USER,
    label: 'Login email was changed',
  },
  {
    emailType: EMAIL_TYPE_ENUM.TWO_FACTOR_OTP,
    audience: EMAIL_AUDIENCE.USER,
    label: 'Two-factor authentication code',
  },
  {
    emailType: EMAIL_TYPE_ENUM.AUTHENTICATOR_DISABLE_OTP,
    audience: EMAIL_AUDIENCE.USER,
    label: 'OTP to disable authenticator app',
  },
  {
    emailType: EMAIL_TYPE_ENUM.ACCOUNT_SUSPENDED,
    audience: EMAIL_AUDIENCE.USER,
    label: 'Account suspended',
  },
  {
    emailType: EMAIL_TYPE_ENUM.ORG_INVITE,
    audience: EMAIL_AUDIENCE.USER,
    label: 'Organisation invite',
  },
  {
    emailType: EMAIL_TYPE_ENUM.CONTACT_US,
    audience: EMAIL_AUDIENCE.USER,
    label: 'Contact-us acknowledgement',
  },
  {
    emailType: EMAIL_TYPE_ENUM.GRIEVANCE,
    audience: EMAIL_AUDIENCE.USER,
    label: 'Grievance acknowledgement',
  },
  {
    emailType: EMAIL_TYPE_ENUM.CAREER,
    audience: EMAIL_AUDIENCE.USER,
    label: 'Career application acknowledgement',
  },
  {
    emailType: EMAIL_TYPE_ENUM.NEWSLETTER,
    audience: EMAIL_AUDIENCE.USER,
    label: 'Newsletter subscription confirmation',
  },
  {
    emailType: EMAIL_TYPE_ENUM.UNSUBSCRIBE_NEWSLETTER,
    audience: EMAIL_AUDIENCE.USER,
    label: 'Newsletter unsubscribe confirmation',
  },

  // ── Form follow-ups (status changes on a submitted ticket) ──────────────
  {
    emailType: FOLLOW_UP_EMAIL_TYPE.IN_PROGRESS,
    audience: EMAIL_AUDIENCE.USER,
    label: 'Follow-up — submission under review',
  },
  {
    emailType: FOLLOW_UP_EMAIL_TYPE.CLOSED,
    audience: EMAIL_AUDIENCE.USER,
    label: 'Follow-up — submission closed, no response',
  },
  {
    emailType: FOLLOW_UP_EMAIL_TYPE.NEED_MORE_INFO,
    audience: EMAIL_AUDIENCE.USER,
    label: 'Follow-up — more information needed',
  },
  {
    emailType: FOLLOW_UP_EMAIL_TYPE.RESOLVED,
    audience: EMAIL_AUDIENCE.USER,
    label: 'Follow-up — submission resolved',
  },

  // ── Admin/ops-facing ────────────────────────────────────────────────────
  {
    emailType: EMAIL_TYPE_ENUM.CONTACT_US,
    audience: EMAIL_AUDIENCE.ADMIN,
    label: 'New contact-us submission (to ops)',
  },
  {
    emailType: EMAIL_TYPE_ENUM.GRIEVANCE,
    audience: EMAIL_AUDIENCE.ADMIN,
    label: 'New grievance submission (to ops)',
  },
  {
    emailType: EMAIL_TYPE_ENUM.CAREER,
    audience: EMAIL_AUDIENCE.ADMIN,
    label: 'New career submission (to ops)',
  },
];

/** How long a resolved templateId mapping is cached in-process, in ms. */
export const TEMPLATE_CACHE_TTL_MS = 60_000;
