# Emails

Every email the API sends goes through [Mailtr](https://mailtr.co). The API
never renders markup for transactional mail. Each send is one request:

```http
POST {MAILTR_API_URL}/api/v1/emails/send
Authorization: Bearer {MAILTR_API_KEY}
Content-Type: application/json

{
  "from": "{MAILTR_FROM_EMAIL}",
  "to": ["user@example.com"],
  "templateId": "tpl_aB3xK9mZ",
  "variables": { "appName": "SquadUp", "url": "https://squadup.in/auth/verify-email?…" }
}
```

Mailtr owns the subject line and the markup. The API decides only **which
template** to use and **which variables** to send. The code is in
`apps/api/src/mailer/`.

## Configuration

| Env var             | Required  | Purpose                                                                                               |
| ------------------- | --------- | ----------------------------------------------------------------------------------------------------- |
| `MAILTR_API_URL`    | no        | Base URL, without the `/api/v1/emails/send` path. Defaults to `https://api.mailtr.co`.                |
| `MAILTR_API_KEY`    | yes       | `mailtr_live_…`. Without it, email is off and every send reports failure (see below).                 |
| `MAILTR_FROM_EMAIL` | no        | Default sender. Defaults to `no-reply@squadup.in`.                                                    |
| `MAILTR_TIMEOUT_MS` | no        | Request timeout. Defaults to `10000`.                                                                 |
| `MAILTR_TEMPLATE_*` | per email | The Mailtr `templateId` for one email, listed in the tables below. Unset means that email isn't sent. |

In production these go in the `PROD_ENV_FILE` secret, which the deploy writes to
`.env.production` on the server.

### How a template is chosen

For each send, the API looks up the email's row in the `email_templates` table,
which is edited from the ops dashboard with `PUT /admin-ops/email-templates`.

1. The row is **deactivated**: the email is not sent, even if an env var is set.
2. The row has a `templateId`: that template is used.
3. Otherwise the email's `MAILTR_TEMPLATE_*` env var is used.
4. Otherwise the email is not sent, and the API logs which env var to set.

A row's `fromEmail` overrides `MAILTR_FROM_EMAIL` either way.
`GET /admin-ops/email-templates` shows each email's `templateId` and its
`source` (`database`, `env`, or `null` when nothing is configured).

### When no template is configured

A send that can't go out returns failure, and the caller decides what that means:

- Registration is rolled back.
- Resending verification, sending a password reset and sending a 2FA code
  each fail with a 400.
- Contact-form acknowledgements, suspension notices and the like are
  best-effort, so the action still succeeds.

So configure at least the **account** templates below before opening sign-ups.

## Variables

### Sent with every template

| Variable  | Example                 |
| --------- | ----------------------- |
| `appName` | `SquadUp`               |
| `appUrl`  | `https://squadup.in`    |
| `email`   | the recipient's address |
| `year`    | `2026`                  |

A template's own variable with the same name wins. For example, the form emails
send the submitter's `email`, which is also the recipient.

### Account

| Env var                                     | Sent when                                                                          | Variables                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `MAILTR_TEMPLATE_WELCOME`                   | An account is registered. Contains the verify-email link.                          | `url`                                                             |
| `MAILTR_TEMPLATE_EMAIL_VERIFICATION`        | A user asks for a new verification link.                                           | `url`                                                             |
| `MAILTR_TEMPLATE_PASSWORD_RESET`            | "Forgot password" is submitted.                                                    | `url`                                                             |
| `MAILTR_TEMPLATE_TWO_FACTOR_OTP`            | A 6-digit code for sign-in, turning email 2FA on or off, or a password reset code. | `otp`                                                             |
| `MAILTR_TEMPLATE_AUTHENTICATOR_DISABLE_OTP` | A user lost their authenticator and asks for a recovery code.                      | `otp`                                                             |
| `MAILTR_TEMPLATE_EMAIL_CHANGE_OTP`          | A user changes their sign-in email. Sent to both addresses.                        | `newEmail`, `otp`                                                 |
| `MAILTR_TEMPLATE_EMAIL_CHANGE_NOTICE`       | The email change is done. Sent to the old address.                                 | `oldEmail`, `newEmail`, `revertUrl`, `changedAt` (ISO 8601), `ip` |
| `MAILTR_TEMPLATE_ACCOUNT_SUSPENDED`         | Staff suspend an account.                                                          | `fullName` (`there` when unset), `reason`                         |

Links in `url` already point at the right web page, such as
`/auth/verify-email?token=…&email=…` or `/auth/forgot-password?token=…&email=…`.
Use them as the button's `href` without changing them. Links and codes expire,
so say so in the copy.

### Forms

| Env var                                  | Sent when                                       | Variables                                                                                                                                 |
| ---------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `MAILTR_TEMPLATE_CONTACT_US`             | A contact form is submitted (to the submitter). | `fullName`, `email`, `company`, `inquiryType`, `message`, `createdAtFormatted`, `ticketId`, `adminEmail`                                  |
| `MAILTR_TEMPLATE_CONTACT_US_ADMIN`       | The same, to the ops inbox.                     | The same, plus `rawPayload`, `userEmail` and `dashboardUrl`. No `adminEmail`.                                                             |
| `MAILTR_TEMPLATE_GRIEVANCE`              | A grievance is submitted (to the submitter).    | `ticketId`, `fullName`, `email`, `subject`, `description`, `grievanceType`, `createdAtFormatted`, `adminEmail`                            |
| `MAILTR_TEMPLATE_GRIEVANCE_ADMIN`        | The same, to the ops inbox.                     | The same without `adminEmail`, plus `dashboardUrl`                                                                                        |
| `MAILTR_TEMPLATE_CAREER`                 | A career application is submitted.              | `fullName`, `email`, `message`, `ticketId`, `socialLinks`, `createdAtFormatted`                                                           |
| `MAILTR_TEMPLATE_CAREER_ADMIN`           | The same, to the ops inbox.                     | The same, plus `dashboardUrl`                                                                                                             |
| `MAILTR_TEMPLATE_NEWSLETTER`             | Someone subscribes to the newsletter.           | `name`, `email`, `subscribed`, `source`, `consentGiven`, `tags`, `unsubscribeToken`, `unsubscribeUrl`, `createdAtFormatted`, `adminEmail` |
| `MAILTR_TEMPLATE_UNSUBSCRIBE_NEWSLETTER` | Someone unsubscribes.                           | `name`, `resubscribeUrl`                                                                                                                  |

### Ticket follow-ups

Sent to the submitter when staff change the status of a contact, grievance or
career ticket. All four receive `formType` (`Contact Us`, `Grievance` or
`Career`), `status`, `ticketId`, `inquiryType`, `assignedTo`, `name` and
`summary`.

| Env var                                    | Status         |
| ------------------------------------------ | -------------- |
| `MAILTR_TEMPLATE_FOLLOW_UP_IN_PROGRESS`    | `inProgress`   |
| `MAILTR_TEMPLATE_FOLLOW_UP_NEED_MORE_INFO` | `needMoreInfo` |
| `MAILTR_TEMPLATE_FOLLOW_UP_RESOLVED`       | `resolved`     |
| `MAILTR_TEMPLATE_FOLLOW_UP_CLOSED`         | `closed`       |

### Not sent yet

`MAILTR_TEMPLATE_SENDER_EMAIL_OTP` and `MAILTR_TEMPLATE_ORG_INVITE` are in the
catalogue, but no code sends them yet.

## Adding an email

1. Add an `EMAIL_TYPE_ENUM` value if it's new, and an entry with its `envKey`
   in `EMAIL_TEMPLATE_CATALOGUE` (`apps/api/src/mailer/constants/mailer.constants.ts`).
2. Send it with `MailerService.notifyUserByEmail` (or `notifyAdminByEmail`) and
   handle a `false` result.
3. Document it in this file and in `.env.example`.
