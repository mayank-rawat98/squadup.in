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

| Env var             | Required | Purpose                                                                                |
| ------------------- | -------- | -------------------------------------------------------------------------------------- |
| `MAILTR_API_URL`    | no       | Base URL, without the `/api/v1/emails/send` path. Defaults to `https://api.mailtr.co`. |
| `MAILTR_API_KEY`    | yes      | `mailtr_live_…`. Without it, email is off and every send reports failure (see below).  |
| `MAILTR_FROM_EMAIL` | no       | Default sender. Defaults to `no-reply@squadup.in`.                                     |
| `MAILTR_TIMEOUT_MS` | no       | Request timeout. Defaults to `10000`.                                                  |

In production these go in the `PROD_ENV_FILE` secret, which the deploy writes to
`.env.production` on the server.

### How a template is chosen

Template IDs are data, not config. Each email has a row in the
`email_templates` table, and staff set its Mailtr `templateId` in the ops
console under **Email templates** (`/admin-ops/email-templates` in the API).
There are no `MAILTR_TEMPLATE_*` env vars.

For each send, the API reads the email's row:

1. The row is **switched off**: the email is not sent.
2. The row has a `templateId`: that template is used.
3. Otherwise the email is not sent, and the API logs that it needs one.

A row's `fromEmail` overrides `MAILTR_FROM_EMAIL`. A change is live on the
instance that saved it at once, and on every instance within a minute.

The API creates a row, with no `templateId`, for every email in the catalogue
when it starts, so a new email shows up in ops as "Not configured" after the
release that adds it. In ops, **Send a test to me** sends the saved template to
the signed-in staff member's own address, with sample values for its
variables.

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

| Email (type / audience)            | Sent when                                                                          | Variables                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `welcome / user`                   | An account is registered. Contains the verify-email link.                          | `url`                                                             |
| `email_verification / user`        | A user asks for a new verification link.                                           | `url`                                                             |
| `password_reset / user`            | "Forgot password" is submitted.                                                    | `url`                                                             |
| `two_factor_otp / user`            | A 6-digit code for sign-in, turning email 2FA on or off, or a password reset code. | `otp`                                                             |
| `authenticator_disable_otp / user` | A user lost their authenticator and asks for a recovery code.                      | `otp`                                                             |
| `email_change_otp / user`          | A user changes their sign-in email. Sent to both addresses.                        | `newEmail`, `otp`                                                 |
| `email_change_notice / user`       | The email change is done. Sent to the old address.                                 | `oldEmail`, `newEmail`, `revertUrl`, `changedAt` (ISO 8601), `ip` |
| `account_suspended / user`         | Staff suspend an account.                                                          | `fullName` (`there` when unset), `reason`                         |

Links in `url` already point at the right web page, such as
`/auth/verify-email?token=…&email=…` or `/auth/forgot-password?token=…&email=…`.
Use them as the button's `href` without changing them. Links and codes expire,
so say so in the copy.

### Forms

| Email (type / audience)         | Sent when                                       | Variables                                                                                                                                 |
| ------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `contact_us / user`             | A contact form is submitted (to the submitter). | `fullName`, `email`, `company`, `inquiryType`, `message`, `createdAtFormatted`, `ticketId`, `adminEmail`                                  |
| `contact_us / admin`            | The same, to the ops inbox.                     | The same, plus `rawPayload`, `userEmail` and `dashboardUrl`. No `adminEmail`.                                                             |
| `grievance / user`              | A grievance is submitted (to the submitter).    | `ticketId`, `fullName`, `email`, `subject`, `description`, `grievanceType`, `createdAtFormatted`, `adminEmail`                            |
| `grievance / admin`             | The same, to the ops inbox.                     | The same without `adminEmail`, plus `dashboardUrl`                                                                                        |
| `career / user`                 | A career application is submitted.              | `fullName`, `email`, `message`, `ticketId`, `socialLinks`, `createdAtFormatted`                                                           |
| `career / admin`                | The same, to the ops inbox.                     | The same, plus `dashboardUrl`                                                                                                             |
| `newsletter / user`             | Someone subscribes to the newsletter.           | `name`, `email`, `subscribed`, `source`, `consentGiven`, `tags`, `unsubscribeToken`, `unsubscribeUrl`, `createdAtFormatted`, `adminEmail` |
| `unsubscribe_newsletter / user` | Someone unsubscribes.                           | `name`, `resubscribeUrl`                                                                                                                  |

### Ticket follow-ups

Sent to the submitter when staff change the status of a contact, grievance or
career ticket. All four receive `formType` (`Contact Us`, `Grievance` or
`Career`), `status`, `ticketId`, `inquiryType`, `assignedTo`, `name` and
`summary`.

| Email (type / audience) | Status         |
| ----------------------- | -------------- |
| `inProgress / user`     | `inProgress`   |
| `needMoreInfo / user`   | `needMoreInfo` |
| `resolved / user`       | `resolved`     |
| `closed / user`         | `closed`       |

### Not sent yet

`sender_email_otp / user` and `org_invite / user` are in the
catalogue, but no code sends them yet.

## Adding an email

1. Add an `EMAIL_TYPE_ENUM` value if it's new, and an entry with its
   `description` and `variables` in `EMAIL_TEMPLATE_CATALOGUE`
   (`apps/api/src/mailer/constants/mailer.constants.ts`).
2. Send it with `MailerService.notifyUserByEmail` (or `notifyAdminByEmail`) and
   handle a `false` result.
3. Document it in this file.
4. After the release, set its `templateId` in ops. Until then it isn't sent.
