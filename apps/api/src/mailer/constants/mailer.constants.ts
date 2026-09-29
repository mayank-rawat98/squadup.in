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
 * Adding a new transactional email = add an entry here, document it in
 * docs/emails.md and .env.example, then set its mailtr templateId through its
 * env var or the ops dashboard.
 */
export interface EmailTemplateCatalogueEntry {
  emailType: string;
  audience: EMAIL_AUDIENCE;
  label: string;
  /**
   * Env var holding this email's mailtr templateId, used when the database row
   * has none. Lets a deploy configure mail without the ops dashboard.
   */
  envKey: string;
}

export const EMAIL_TEMPLATE_CATALOGUE: ReadonlyArray<EmailTemplateCatalogueEntry> =
  [
    // ── User-facing ─────────────────────────────────────────────────────────
    {
      emailType: EMAIL_TYPE_ENUM.WELCOME,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Welcome / verify email on registration',
      envKey: 'MAILTR_TEMPLATE_WELCOME',
    },
    {
      emailType: EMAIL_TYPE_ENUM.EMAIL_VERIFICATION,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Verify email address',
      envKey: 'MAILTR_TEMPLATE_EMAIL_VERIFICATION',
    },
    {
      emailType: EMAIL_TYPE_ENUM.PASSWORD_RESET,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Reset password',
      envKey: 'MAILTR_TEMPLATE_PASSWORD_RESET',
    },
    {
      emailType: EMAIL_TYPE_ENUM.SENDER_EMAIL_OTP,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Sender email verification OTP',
      envKey: 'MAILTR_TEMPLATE_SENDER_EMAIL_OTP',
    },
    {
      emailType: EMAIL_TYPE_ENUM.EMAIL_CHANGE_OTP,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Confirm new login email',
      envKey: 'MAILTR_TEMPLATE_EMAIL_CHANGE_OTP',
    },
    {
      emailType: EMAIL_TYPE_ENUM.EMAIL_CHANGE_NOTICE,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Login email was changed',
      envKey: 'MAILTR_TEMPLATE_EMAIL_CHANGE_NOTICE',
    },
    {
      emailType: EMAIL_TYPE_ENUM.TWO_FACTOR_OTP,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Two-factor authentication code',
      envKey: 'MAILTR_TEMPLATE_TWO_FACTOR_OTP',
    },
    {
      emailType: EMAIL_TYPE_ENUM.AUTHENTICATOR_DISABLE_OTP,
      audience: EMAIL_AUDIENCE.USER,
      label: 'OTP to disable authenticator app',
      envKey: 'MAILTR_TEMPLATE_AUTHENTICATOR_DISABLE_OTP',
    },
    {
      emailType: EMAIL_TYPE_ENUM.ACCOUNT_SUSPENDED,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Account suspended',
      envKey: 'MAILTR_TEMPLATE_ACCOUNT_SUSPENDED',
    },
    {
      emailType: EMAIL_TYPE_ENUM.ORG_INVITE,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Organisation invite',
      envKey: 'MAILTR_TEMPLATE_ORG_INVITE',
    },
    {
      emailType: EMAIL_TYPE_ENUM.CONTACT_US,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Contact-us acknowledgement',
      envKey: 'MAILTR_TEMPLATE_CONTACT_US',
    },
    {
      emailType: EMAIL_TYPE_ENUM.GRIEVANCE,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Grievance acknowledgement',
      envKey: 'MAILTR_TEMPLATE_GRIEVANCE',
    },
    {
      emailType: EMAIL_TYPE_ENUM.CAREER,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Career application acknowledgement',
      envKey: 'MAILTR_TEMPLATE_CAREER',
    },
    {
      emailType: EMAIL_TYPE_ENUM.NEWSLETTER,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Newsletter subscription confirmation',
      envKey: 'MAILTR_TEMPLATE_NEWSLETTER',
    },
    {
      emailType: EMAIL_TYPE_ENUM.UNSUBSCRIBE_NEWSLETTER,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Newsletter unsubscribe confirmation',
      envKey: 'MAILTR_TEMPLATE_UNSUBSCRIBE_NEWSLETTER',
    },

    // ── Form follow-ups (status changes on a submitted ticket) ──────────────
    {
      emailType: FOLLOW_UP_EMAIL_TYPE.IN_PROGRESS,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Follow-up — submission under review',
      envKey: 'MAILTR_TEMPLATE_FOLLOW_UP_IN_PROGRESS',
    },
    {
      emailType: FOLLOW_UP_EMAIL_TYPE.CLOSED,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Follow-up — submission closed, no response',
      envKey: 'MAILTR_TEMPLATE_FOLLOW_UP_CLOSED',
    },
    {
      emailType: FOLLOW_UP_EMAIL_TYPE.NEED_MORE_INFO,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Follow-up — more information needed',
      envKey: 'MAILTR_TEMPLATE_FOLLOW_UP_NEED_MORE_INFO',
    },
    {
      emailType: FOLLOW_UP_EMAIL_TYPE.RESOLVED,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Follow-up — submission resolved',
      envKey: 'MAILTR_TEMPLATE_FOLLOW_UP_RESOLVED',
    },

    // ── Admin/ops-facing ────────────────────────────────────────────────────
    {
      emailType: EMAIL_TYPE_ENUM.CONTACT_US,
      audience: EMAIL_AUDIENCE.ADMIN,
      label: 'New contact-us submission (to ops)',
      envKey: 'MAILTR_TEMPLATE_CONTACT_US_ADMIN',
    },
    {
      emailType: EMAIL_TYPE_ENUM.GRIEVANCE,
      audience: EMAIL_AUDIENCE.ADMIN,
      label: 'New grievance submission (to ops)',
      envKey: 'MAILTR_TEMPLATE_GRIEVANCE_ADMIN',
    },
    {
      emailType: EMAIL_TYPE_ENUM.CAREER,
      audience: EMAIL_AUDIENCE.ADMIN,
      label: 'New career submission (to ops)',
      envKey: 'MAILTR_TEMPLATE_CAREER_ADMIN',
    },
  ];

/** How long a resolved templateId mapping is cached in-process, in ms. */
export const TEMPLATE_CACHE_TTL_MS = 60_000;

/** Product name sent to every template as the `appName` variable. */
export const EMAIL_APP_NAME = 'SquadUp';
