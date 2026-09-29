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
 * themselves live in mailtr, and the templateId for each pair lives in the
 * `email_templates` table, set by staff from the ops console. This is only the
 * catalogue those rows are keyed on, plus what ops shows about each email.
 *
 * Adding a new transactional email = add an entry here and in docs/emails.md.
 * Its row is created when the API next boots; staff then set its templateId.
 */
export interface EmailTemplateCatalogueEntry {
  emailType: string;
  audience: EMAIL_AUDIENCE;
  label: string;
  /** When the email is sent, for whoever writes its template. */
  description: string;
  /**
   * The variables the send passes, besides EMAIL_BASE_VARIABLES. Ops lists
   * them so the template can be written against the right names.
   */
  variables: readonly string[];
}

/** Variables every template receives, whatever the email. */
export const EMAIL_BASE_VARIABLES: readonly string[] = [
  'appName',
  'appUrl',
  'email',
  'year',
];

const CONTACT_US_VARIABLES = [
  'fullName',
  'email',
  'company',
  'inquiryType',
  'message',
  'createdAtFormatted',
  'ticketId',
];
const GRIEVANCE_VARIABLES = [
  'ticketId',
  'fullName',
  'email',
  'subject',
  'description',
  'grievanceType',
  'createdAtFormatted',
];
const CAREER_VARIABLES = [
  'fullName',
  'email',
  'message',
  'ticketId',
  'socialLinks',
  'createdAtFormatted',
];
const FOLLOW_UP_VARIABLES = [
  'formType',
  'status',
  'ticketId',
  'inquiryType',
  'assignedTo',
  'name',
  'summary',
];

export const EMAIL_TEMPLATE_CATALOGUE: ReadonlyArray<EmailTemplateCatalogueEntry> =
  [
    // ── User-facing ─────────────────────────────────────────────────────────
    {
      emailType: EMAIL_TYPE_ENUM.WELCOME,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Welcome / verify email on registration',
      description: 'An account is registered. Contains the verify-email link.',
      variables: ['url'],
    },
    {
      emailType: EMAIL_TYPE_ENUM.EMAIL_VERIFICATION,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Verify email address',
      description: 'A user asks for a new verification link.',
      variables: ['url'],
    },
    {
      emailType: EMAIL_TYPE_ENUM.PASSWORD_RESET,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Reset password',
      description: '"Forgot password" is submitted.',
      variables: ['url'],
    },
    {
      emailType: EMAIL_TYPE_ENUM.SENDER_EMAIL_OTP,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Sender email verification OTP',
      description: 'In the catalogue, but no code sends it yet.',
      variables: [],
    },
    {
      emailType: EMAIL_TYPE_ENUM.EMAIL_CHANGE_OTP,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Confirm new login email',
      description:
        'A user changes their sign-in email. Sent to both addresses.',
      variables: ['newEmail', 'otp'],
    },
    {
      emailType: EMAIL_TYPE_ENUM.EMAIL_CHANGE_NOTICE,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Login email was changed',
      description:
        'The email change is done. Sent to the old address; changedAt is ISO 8601.',
      variables: ['oldEmail', 'newEmail', 'revertUrl', 'changedAt', 'ip'],
    },
    {
      emailType: EMAIL_TYPE_ENUM.TWO_FACTOR_OTP,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Two-factor authentication code',
      description:
        'A 6-digit code for sign-in, turning email 2FA on or off, or a password reset code.',
      variables: ['otp'],
    },
    {
      emailType: EMAIL_TYPE_ENUM.AUTHENTICATOR_DISABLE_OTP,
      audience: EMAIL_AUDIENCE.USER,
      label: 'OTP to disable authenticator app',
      description:
        'A user lost their authenticator and asks for a recovery code.',
      variables: ['otp'],
    },
    {
      emailType: EMAIL_TYPE_ENUM.ACCOUNT_SUSPENDED,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Account suspended',
      description:
        'Staff suspend an account. fullName is "there" when the user has none.',
      variables: ['fullName', 'reason'],
    },
    {
      emailType: EMAIL_TYPE_ENUM.ORG_INVITE,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Organisation invite',
      description: 'In the catalogue, but no code sends it yet.',
      variables: [],
    },
    {
      emailType: EMAIL_TYPE_ENUM.CONTACT_US,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Contact-us acknowledgement',
      description: 'A contact form is submitted. Sent to the submitter.',
      variables: [...CONTACT_US_VARIABLES, 'adminEmail'],
    },
    {
      emailType: EMAIL_TYPE_ENUM.GRIEVANCE,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Grievance acknowledgement',
      description: 'A grievance is submitted. Sent to the submitter.',
      variables: [...GRIEVANCE_VARIABLES, 'adminEmail'],
    },
    {
      emailType: EMAIL_TYPE_ENUM.CAREER,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Career application acknowledgement',
      description: 'A career application is submitted. Sent to the applicant.',
      variables: CAREER_VARIABLES,
    },
    {
      emailType: EMAIL_TYPE_ENUM.NEWSLETTER,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Newsletter subscription confirmation',
      description: 'Someone subscribes to the newsletter.',
      variables: [
        'name',
        'email',
        'subscribed',
        'source',
        'consentGiven',
        'tags',
        'unsubscribeToken',
        'unsubscribeUrl',
        'createdAtFormatted',
        'adminEmail',
      ],
    },
    {
      emailType: EMAIL_TYPE_ENUM.UNSUBSCRIBE_NEWSLETTER,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Newsletter unsubscribe confirmation',
      description: 'Someone unsubscribes from the newsletter.',
      variables: ['name', 'resubscribeUrl'],
    },

    // ── Form follow-ups (status changes on a submitted ticket) ──────────────
    {
      emailType: FOLLOW_UP_EMAIL_TYPE.IN_PROGRESS,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Follow-up — submission under review',
      description: 'Staff move a ticket to "in progress".',
      variables: FOLLOW_UP_VARIABLES,
    },
    {
      emailType: FOLLOW_UP_EMAIL_TYPE.CLOSED,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Follow-up — submission closed, no response',
      description: 'Staff close a ticket.',
      variables: FOLLOW_UP_VARIABLES,
    },
    {
      emailType: FOLLOW_UP_EMAIL_TYPE.NEED_MORE_INFO,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Follow-up — more information needed',
      description: 'Staff ask the submitter for more information.',
      variables: FOLLOW_UP_VARIABLES,
    },
    {
      emailType: FOLLOW_UP_EMAIL_TYPE.RESOLVED,
      audience: EMAIL_AUDIENCE.USER,
      label: 'Follow-up — submission resolved',
      description: 'Staff resolve a ticket.',
      variables: FOLLOW_UP_VARIABLES,
    },

    // ── Admin/ops-facing ────────────────────────────────────────────────────
    {
      emailType: EMAIL_TYPE_ENUM.CONTACT_US,
      audience: EMAIL_AUDIENCE.ADMIN,
      label: 'New contact-us submission (to ops)',
      description: 'A contact form is submitted. Sent to the ops inbox.',
      variables: [
        ...CONTACT_US_VARIABLES,
        'rawPayload',
        'userEmail',
        'dashboardUrl',
      ],
    },
    {
      emailType: EMAIL_TYPE_ENUM.GRIEVANCE,
      audience: EMAIL_AUDIENCE.ADMIN,
      label: 'New grievance submission (to ops)',
      description: 'A grievance is submitted. Sent to the ops inbox.',
      variables: [...GRIEVANCE_VARIABLES, 'dashboardUrl'],
    },
    {
      emailType: EMAIL_TYPE_ENUM.CAREER,
      audience: EMAIL_AUDIENCE.ADMIN,
      label: 'New career submission (to ops)',
      description: 'A career application is submitted. Sent to the ops inbox.',
      variables: [...CAREER_VARIABLES, 'dashboardUrl'],
    },
  ];

/** The catalogue entry for one (emailType, audience), if the app sends it. */
export function findCatalogueEntry(
  emailType: string,
  audience: EMAIL_AUDIENCE,
): EmailTemplateCatalogueEntry | undefined {
  return EMAIL_TEMPLATE_CATALOGUE.find(
    (e) => e.emailType === emailType && e.audience === audience,
  );
}

/**
 * A mailtr template identifier: `tpl_aB3xK9mZ` and the like. Checked on write
 * so a pasted URL or a stray space never becomes a send that fails at mailtr.
 */
export const TEMPLATE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/** How long a resolved templateId mapping is cached in-process, in ms. */
export const TEMPLATE_CACHE_TTL_MS = 60_000;

/** Product name sent to every template as the `appName` variable. */
export const EMAIL_APP_NAME = 'SquadUp';
