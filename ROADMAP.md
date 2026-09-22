# SquadUp Roadmap

What gets built next, in order, with enough detail that a contributor (human
or AI coding agent) can pick up a milestone and ship it without guessing.

For what SquadUp is, see the [README](README.md). For how to set up and submit
work, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## How to use this document

**Read this before writing any code for a milestone.**

1. Work on the **first milestone that isn't marked Done**, one task at a time,
   in the order listed. Later milestones depend on earlier ones.
2. **The API is the contract.** Every endpoint referenced here already exists
   unless it is explicitly marked _(new)_. Check the real request and response
   shapes in Swagger at `http://localhost:8080/api/docs` or in the controller
   files named below before calling them. Don't invent endpoints, fields or
   routes. If something you need is missing, add it to the API in the same
   pull request and note it in the task.
3. **Match the existing code.** Before creating a file, open a neighbour and
   copy its structure, naming and comment style. Shared UI goes in `libs/ui`
   ([rules](libs/ui/README.md)); the landing page
   (`apps/web/src/features/landing`) is the reference for feature layout.
4. **Use the design system.** Violet primary, light and dark themes, Inter.
   Use the tokens in `libs/ui/src/styles/index.css` and never hardcode colours.
5. **Keep this file current.** When a task ships, tick it here in the same
   pull request. If you find a bug in the API while building, add it to
   "Known issues" in that milestone.
6. **Definition of done** for every task: works in light and dark mode, works
   at 360px wide, reachable with the keyboard, form errors are announced to
   screen readers, `npx nx run-many -t lint test typecheck` passes, and the
   acceptance criteria below are met.

Status legend: ✅ Done · 🚧 In progress · ⬜ Not started

| #   | Milestone                                                                         | Status |
| --- | --------------------------------------------------------------------------------- | ------ |
| 1   | [Authentication pages](#milestone-1-authentication-pages)                         | ⬜     |
| 2   | [App shell, dashboard and profile](#milestone-2-app-shell-dashboard-and-profile)  | ⬜     |
| 3   | [Solo challenges and leaderboards](#milestone-3-solo-challenges-and-leaderboards) | ⬜     |
| 4   | [Arenas and proctoring](#milestone-4-arenas-and-proctoring)                       | ⬜     |
| 5   | [Coding board](#milestone-5-coding-board)                                         | ⬜     |
| 6   | [Rewards store](#milestone-6-rewards-store)                                       | ⬜     |
| 7   | [Operations console](#milestone-7-operations-console)                             | ⬜     |

---

## Emails and Mailtr templates

Read this before touching anything that sends an email.

SquadUp sends every transactional email (verification links, password resets,
2FA codes, and so on) through **[Mailtr](https://mailtr.co) templates**. The
API never renders email HTML. A send is just a Mailtr `templateId` plus a set
of variables, and Mailtr renders the email.

How it's wired:

- Every email the app can send is listed in `EMAIL_TEMPLATE_CATALOGUE` in
  `apps/api/src/mailer/constants/mailer.constants.ts`, keyed by
  `emailType` + `audience`.
- The mapping from each entry to a Mailtr `templateId` is stored in the
  `email_templates` database table and edited at runtime through the ops API
  (`admin-ops/email-templates`). It is **not** hardcoded.
- If an email type has no `templateId` set, the send is skipped and a warning
  is logged. The feature still works; the email just doesn't go out.

**Who owns the templates:**

- If you run your own copy of SquadUp, create your own templates in your own
  Mailtr account, design them however you like, and map their IDs to the
  email types. Nothing in the code needs to change.
- For the official deployment at **squadup.in**, the templates are created and
  mapped by the maintainer. Pull requests should **not** add email HTML,
  template files or template IDs to this repository.

**To add a new email:** add an entry to `EMAIL_TEMPLATE_CATALOGUE`, call
`MailerService.notifyUserByEmail({ recipient, emailType, emailData })`, and
list the variables you pass in the table below so template authors know what's
available.

Variables each auth email receives:

| `emailType`                 | Sent when                        | Variables                                                      |
| --------------------------- | -------------------------------- | -------------------------------------------------------------- |
| `welcome`                   | Registration                     | `url` (verify-email link)                                      |
| `email_verification`        | Resend verification              | `url`                                                          |
| `password_reset`            | Forgot password                  | `url` (reset link)                                             |
| `two_factor_otp`            | Email 2FA code at login or setup | `otp`, `year`                                                  |
| `authenticator_disable_otp` | Lost authenticator recovery      | `otp`, `year`                                                  |
| `email_change_otp`          | Changing login email             | `otp`, `newEmail`, `year`                                      |
| `email_change_notice`       | Login email was changed          | `oldEmail`, `newEmail`, `revertUrl`, `changedAt`, `ip`, `year` |

---

## Milestone 1: Authentication pages

**Goal:** a visitor can register, verify their email, sign in, reset a
forgotten password, and turn on two-factor authentication with an
authenticator app or email. Once 2FA is on, **every** sign-in asks for a
second factor. There is no "trust this device" skip.

**The backend is already built.** This milestone is almost entirely frontend
work in `apps/web`, plus a few form components in `libs/ui`.

**Out of scope for this milestone:** SMS/phone 2FA and passkeys. The API
supports both, but their UI comes later. Hide those options if the API
returns them as available methods.

### 1.1 Foundations

Do these first; every page depends on them.

- ⬜ **Dependencies.** Add `zod`, `react-hook-form`,
  `@hookform/resolvers`, `input-otp` and `sonner` (toasts). For server state,
  use `@tanstack/react-query`. Don't add Redux.
- ⬜ **Form components in `libs/ui`.** `Input`, `PasswordInput` (show/hide
  toggle), `Label`, `Checkbox`, `FieldError`, `OtpInput` (6 slots, digits
  only, auto-focus, paste support, built on `input-otp`) and `Toaster`. Follow
  the atoms/molecules split and export them from the package index.
- ⬜ **API client** in `apps/web/src/lib/api/`:
  - Base URL from a new `NEXT_PUBLIC_API_URL` (e.g.
    `http://localhost:8080/api/v1`). It's already in `.env.example`.
    Next.js only reads env files from `apps/web`, not the repo root, so load
    the root `.env.local` in `apps/web/next.config.js` with `loadEnvConfig`
    from `@next/env` (pointed at the workspace root). Don't add a second env
    file.
  - Always send `credentials: 'include'` (the refresh token and the 2FA
    session are `HttpOnly` cookies).
  - Headers: `Authorization: Bearer <accessToken>` when signed in,
    `x-device-id: <deviceId>` when known, `x-app-origin: web-app`.
  - Every response is `{ success, data, message }`. Errors carry a
    human-readable `message`; show it in a toast or next to the field.
  - On `401`, call `POST /auth/refresh` **once**, shared by all concurrent
    requests (a single in-flight promise, because refresh tokens rotate), then
    retry the original request. If the refresh fails, clear the session and
    send the user to `/auth/login?redirect=<current path>`.
- ⬜ **Session store** (`apps/web/src/lib/auth/`): keep `accessToken`,
  `deviceId` and `expiresIn` in memory, and mirror them to `localStorage` when
  "Remember me" was ticked or `sessionStorage` when it wasn't. Remember the
  choice across the 2FA step. `POST /auth/refresh` does not return
  `rememberMe`, so keep using the storage chosen at sign-in. Load the current
  user with `GET /auth/me`.
- ⬜ **Safe post-login redirect.** Keep `?redirect=` in `sessionStorage` so
  it survives the 2FA detour. Accept only same-origin paths: must start with
  `/` and must not start with `//` or `/\`. Anything else falls back to the
  default (`/dashboard`, a placeholder page until Milestone 2).
- ⬜ **Route guards.** Signed-in users who open an `/auth/*` page go to the
  redirect target. Signed-out users who open an app page go to
  `/auth/login?redirect=…`. Avoid a flash of the wrong UI while `GET
/auth/me` loads.
- ⬜ **Auth layout.** A shared two-column layout for `/auth/*`: brand panel
  on the left (hidden on mobile) and form on the right.

### 1.2 Routes

Paths are fixed: the API puts some of them in email links.

| Path                        | Page                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| `/auth/register`            | Create account                                                                                  |
| `/auth/verify-email`        | Email verification (link target from email)                                                     |
| `/auth/login`               | Sign in                                                                                         |
| `/auth/forgot-password`     | Request a reset link, **or** set a new password when `?token=&email=` are present (link target) |
| `/auth/2fa`                 | Choose a second-factor method                                                                   |
| `/auth/2fa/verify?method=…` | Enter the code (`authenticator`, `email`, `backupCode`)                                         |
| `/settings/security`        | Turn 2FA on or off, backup codes                                                                |

All endpoints below are relative to `/api/v1`.

### 1.3 Register (`/auth/register`)

- Fields: email, password (8–128 chars), confirm password, "I accept the
  Terms and Privacy Policy" checkbox (required).
- `POST /auth/register` with `{ email, password, acceptedTerms: true }`.
- On success, show a "Check your inbox" state naming the email address, with
  a **Resend** button (`POST /auth/resend-verification-email { email }`) that
  has a 60-second cooldown.
- "Continue with Google" button: `POST /auth/google { code, rememberMe: true }`
  using the Google Identity Services popup code flow
  (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`). Handle the `requiresTwoFactor` response
  exactly like password login.
- Link to sign in.

**Done when:** a new account is created, the `welcome` email is triggered,
duplicate emails show the API's error, and the form validates on the client
before submitting.

### 1.4 Verify email (`/auth/verify-email?token=…&email=…`)

- On load, `POST /auth/verify-email { token, encodedEmail }`, where
  `encodedEmail = encodeURIComponent(email)`. Guard against double submission
  (React strict mode runs effects twice).
- States: verifying (spinner), success (link to sign in or dashboard), and
  expired or invalid (resend form pre-filled with the email).
- Unverified users can still sign in. Show a dismissible banner in the app
  with a resend button until `user.emailVerified` is true.

### 1.5 Sign in (`/auth/login`)

- Fields: email, password, "Remember me". Links: forgot password, create
  account. "Continue with Google".
- `POST /auth/login { email, password, rememberMe }`. Two possible responses:
  1. **Signed in:** `{ user, accessToken, deviceId, expiresIn }`. Store the
     session and go to the redirect target.
  2. **Second factor needed:** `{ requiresTwoFactor: true, availableMethods:
[{ method, preference }] }`. The API has also set an `HttpOnly`
     `2fa_session` cookie. Store `availableMethods` in `sessionStorage` and
     continue with the 2FA flow below.
- Suspended accounts get a `403` with an explanation. Show it as is.

### 1.6 Two-factor sign-in (`/auth/2fa`, `/auth/2fa/verify`)

The flow after a `requiresTwoFactor` response:

```text
login ─► pick default method
          ├─ authenticator available ─► POST /auth/2fa/select-method {method:'authenticator'}
          │                            ─► /auth/2fa/verify?method=authenticator
          ├─ else email available ────► POST /auth/2fa/select-method {method:'email'}  (sends two_factor_otp)
          │                            ─► /auth/2fa/verify?method=email
          └─ else ────────────────────► /auth/2fa (method chooser)

/auth/2fa/verify ─► POST /auth/verify-2fa { code, method }
                    ─► { user, accessToken, deviceId, expiresIn } ─► store session ─► redirect target
```

- **Method chooser (`/auth/2fa`):** one card per available method (from
  `sessionStorage`), with authenticator app, email code and backup code shown
  in that order. Selecting one calls `POST /auth/2fa/select-method { method }`
  and goes to the verify page. If `sessionStorage` has no methods (for example,
  the page was opened directly), send the user back to `/auth/login`.
- **Verify page:** a 6-digit `OtpInput` for `authenticator` and `email`, or a
  text input for `backupCode` (up to 12 characters). It submits automatically
  when all 6 digits are entered. For `email`, add **Resend code** with a
  60-second cooldown (calls `select-method` again). Include "Try another way"
  (back to the chooser) and "Back to sign in".
- The `2fa_session` cookie expires, and the API limits attempts. When it
  answers `401` ("No active 2FA session"), tell the user the sign-in timed out
  and send them back to `/auth/login`.
- On success, clear the stored methods and go to the redirect target.

**Done when:** with authenticator 2FA on, a correct password alone never
creates a session; a wrong code shows an error without clearing the input
focus; and a backup code works once and is rejected on second use.

### 1.7 Forgot password (`/auth/forgot-password`)

- **No token in the URL:** email field, then `POST /users/forgot-password-email
{ email }`. Always show the same "If an account exists, we've sent a link"
  message so the page doesn't reveal which emails are registered.
- **`?token=…&email=…` present:** new password and confirm fields, then `POST
/users/forgot-password { token, encodedEmail, newPassword }`. On success, go
  to `/auth/login` with a success toast. On an expired token, show the email
  form again.

### 1.8 Security settings (`/settings/security`)

Requires a signed-in user. This is where 2FA is turned on.

**Authenticator app**

1. `POST /settings/2fa/authenticator/setup` returns `{ qrCode, secret }`.
   Show the QR code image and the secret, with a copy button, for manual
   entry.
2. The user enters the 6-digit code: `POST /settings/2fa/authenticator/verify`.
   The response contains `backupCodes`.
3. Show the backup codes **once**, with copy and download (`.txt`) options and
   an "I've saved these" confirmation before closing.
4. Also offer "Regenerate backup codes"
   (`POST /settings/2fa/authenticator/regenerate-backup-codes`) and
   "Turn off" (`POST /settings/2fa/authenticator/disable`, needs a current
   code). For a lost device, the recovery path is `send-recovery-otp` followed
   by `disable-with-email`.

**Email codes**

1. `POST /settings/2fa/email/send-otp` sends a `two_factor_otp` email.
2. `POST /settings/2fa/email/verify-otp { code }` turns email 2FA on.
3. To turn it off: `send-disable-otp`, then `POST /settings/2fa/email/disable`.

Show which methods are on (from `GET /auth/me`, under
`settings.twoFactor.*.enabled`) and refresh that after every change.

**Done when:** a user can turn on each method, sign out, and be asked for it
on the next sign-in; and turning off the last method removes the prompt.

### 1.9 Known issues to fix in this milestone

- ⬜ `apps/api/src/users/users.service.ts` builds the verification link as
  `/verify-email?...` without the `/auth` prefix, so it doesn't match
  `auth.service.ts` or the route above. Change it to `/auth/verify-email`.
- ⬜ `VerifiedEmailGuard` exists but isn't applied to any route. Decide which
  actions require a verified email (at least joining arenas and redeeming
  rewards) and apply it there when those features land.

---

## Milestone 2: App shell, dashboard and profile

**Goal:** a signed-in home that later features plug into.

- ⬜ App layout for signed-in pages: sidebar (Dashboard, Challenges, Arenas,
  Coding board, Leaderboard, Store), top bar with search, notifications and a
  user menu, and a mobile drawer.
- ⬜ Dashboard: welcome state, stats placeholders, recent activity. Use empty
  states (`libs/ui` `EmptyState`) for features that aren't built yet.
- ⬜ Profile and account settings: name and avatar (`PATCH /users`,
  `PATCH /users/me/avatar`), change password (`POST /users/reset-password`),
  change email (the `auth/email-change/*` flow), active devices
  (`GET /auth/user-devices`, `POST /auth/revoke-device`), and sign out
  everywhere (`POST /auth/logout-all`).
- ⬜ Public profile page (`/u/<username>`). The username field doesn't exist
  yet _(new)_.
- ⬜ Notifications bell using the existing notifications module and Socket.IO
  gateway.

---

## Milestone 3: Solo challenges and leaderboards

**Goal:** a student picks a problem, solves it in the browser **without AI
help**, and climbs the leaderboard. This builds the editor and judge that
Arenas reuse, so it comes first.

**Decide before building** (record the decision here):

- Code execution: a self-hosted Judge0 or Piston, or a custom runner of
  sandboxed containers with no network and CPU/memory/time limits. Untrusted
  code must never run on the API host.
- Editor: Monaco (the VS Code editor) or CodeMirror 6.
- Initial languages: suggested C++, Java, Python and JavaScript.

Tasks:

- ⬜ Data model _(new)_: problems (statement in Markdown, difficulty, tags,
  limits), test cases (samples visible, rest hidden), submissions and
  verdicts.
- ⬜ Judge service: queue submissions (RabbitMQ is already in the stack), run
  them in the sandbox, and store the verdict (Accepted, Wrong Answer, Time
  Limit, Runtime Error, Compile Error) with runtime and memory.
- ⬜ Problem list with filters (difficulty, tag, solved/unsolved), and a problem
  page with a split view: statement on one side, editor and results on the
  other, plus "Run" (samples only) and "Submit" (all tests).
- ⬜ Paste restrictions in the editor: block paste from outside the editor in
  challenges, in keeping with the no-AI mission. Full proctoring comes in
  Milestone 4.
- ⬜ Scoring and leaderboards: global and weekly, ranked by points from solved
  problems weighted by difficulty. Cache rankings in Redis sorted sets.
- ⬜ Ops: create and edit problems and test cases.

---

## Milestone 4: Arenas and proctoring

**Goal:** timed, proctored contests where students compete alone or as
squads against other squads, and winners earn rewards.

- ⬜ Squads _(new)_: create, invite (by link or email), join, leave, roles
  (captain or member), and a size limit per arena.
- ⬜ Arena lifecycle: draft, registration open, live, judging, results.
  Solo or team format, start and end times, a problem set drawn from the
  Milestone 3 bank, and a prize list linked to store items.
- ⬜ Arena room: countdown, problem tabs, shared team submissions, a live
  scoreboard over Socket.IO, and a freeze in the final minutes.
- ⬜ **Proctoring.** All of this is recorded as events against the attempt so
  a reviewer can see a timeline:
  - Tab and focus tracking: tab switches, window blur, leaving fullscreen
    (fullscreen required during a live arena).
  - Paste blocking: paste from outside the editor is blocked, and large inserts
    are flagged.
  - Webcam and microphone monitoring, with explicit consent before joining.
  - Keystroke analysis: typing cadence and a replay of how the code was
    written, used to flag copied or AI-generated code.
  - An integrity score per attempt, plus a review queue in ops to disqualify or
    clear flagged attempts.
- ⬜ **Privacy and legal (must ship with webcam and mic):** a consent screen,
  a privacy policy covering retention and who can view recordings, automatic
  deletion after a fixed period, and compliance with India's DPDP Act,
  including parental consent for users under 18.
- ⬜ Results: final rankings, per-problem breakdown, certificates, and prize
  claims feeding into Milestone 6.

---

## Milestone 5: Coding board

**Goal:** a shared room where friends code, talk and sketch together.

**Decide before building:** the CRDT library (Yjs is the default choice,
with `y-monaco` or `y-codemirror`), voice transport (WebRTC mesh for small
rooms, or an SFU such as LiveKit), and the whiteboard engine (tldraw or
Excalidraw).

- ⬜ Boards _(new)_: create, invite, permissions, file tree.
- ⬜ Real-time editor: shared documents, live cursors with names and colours,
  presence (who is online and which file they're in).
- ⬜ Chat per board, backed by Socket.IO and stored in the database.
- ⬜ Voice channels: join and leave, mute, active-speaker indicator.
- ⬜ Whiteboard: shared canvas with shapes, freehand drawing and text.
- ⬜ React + TypeScript playground with a live preview in a sandboxed iframe.
- ⬜ Code execution by reusing the Milestone 3 runner.

---

## Milestone 6: Rewards store

**Goal:** turn wins into real things. The headline items are **3D-printed
products made by SquadUp**, alongside goodies such as jackets and bottles.

- ⬜ Catalogue _(new)_: products, variants (size, colour), stock, images
  (MinIO), and 3D-printed items flagged and featured first.
- ⬜ Earning: arena prizes grant specific items, and points from challenges
  and arenas can be redeemed.
- ⬜ Claim flow: shipping address, order status (claimed, printing, shipped,
  delivered) and email updates (new Mailtr email types, see
  [Emails and Mailtr templates](#emails-and-mailtr-templates)).
- ⬜ Ops: manage catalogue and stock, and fulfil orders.
- ⬜ Paid purchases: later, if at all. Decide the payment provider then.

---

## Milestone 7: Operations console

**Goal:** everything staff need to run SquadUp, in `apps/ops`. Build each
screen alongside the feature it manages; this milestone covers what's left.

- ⬜ Staff sign in (separate staff realm, already in the API).
- ⬜ Users: search, view, suspend or restore, audit log.
- ⬜ Email templates: map each email type to a Mailtr `templateId`
  (`admin-ops/email-templates`).
- ⬜ Feature flags, blogs, changelog, and contact/grievance inbox (all
  existing API modules).
- ⬜ Content: problems (Milestone 3), arenas and proctoring review
  (Milestone 4), store orders (Milestone 6).
