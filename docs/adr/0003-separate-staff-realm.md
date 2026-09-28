# ADR-0003: Staff are a separate identity realm from customers

**Status:** accepted (recorded retroactively) · **Date:** 2026-08-02

## Context

SquadUp's own operators need to manage users, blogs, feature flags, email templates and backups from `apps/ops`. Customers sign in to `apps/web` with passwords, passkeys, TOTP and Google.

## Decision

Staff are a separate realm (`apps/api/src/staff/`): a `Staff` entity, separate credentials, separate JWTs signed with `STAFF_JWT_SECRET`, separate sessions, and `StaffGuard`. It shares nothing with the customer `User` realm except the Redis connection. A customer role never grants staff access, and there is no "admin" flag on a user.

`StaffGuard` is applied explicitly on each staff controller, even though there is one role today, so that adding a role hierarchy later is a change inside the guard, not at every route.

Passkeys are a customer-only feature. The WebAuthn relying party is bound to the web origin.

## Alternatives rejected

- **A role on the customer `User` table.** Not recorded at the time. A single table would mean one compromised or mis-scoped customer token could reach staff routes, and every customer auth change would also be a staff auth change.

## Consequences

- Two sign-in flows, two token types, and two sets of tests to keep up.
- `StaffModule` is `@Global()`, because several feature modules (backup, minio, forms, changelog, admin-ops) guard routes with `StaffGuard`.
- Staff-only authoring routes live under `admin-ops/`, apart from the public routes for the same data.
