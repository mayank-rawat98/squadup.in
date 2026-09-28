# ADR-0001: One Nx monorepo, with the design system as a shared library

**Status:** accepted (recorded retroactively) · **Date:** 2026-08-02

## Context

SquadUp has an API and two Next.js apps: `web` for customers and `ops` for staff. Both apps have to look like one product, and both call the same API.

## Decision

Everything lives in one repository, managed by Nx 23 with npm workspaces:

- `apps/api`, `apps/web`, `apps/ops`, plus `apps/api-e2e` and `apps/web-e2e`.
- `libs/ui` (`@squadup.in/ui`) holds every shared component and the design tokens. The apps consume it as TypeScript source, so edits hot-reload in both apps with no build step in the dev loop.
- Projects are tagged `type:app`, `type:lib` or `type:e2e`. ESLint's `@nx/enforce-module-boundaries` lets apps depend only on libs, and libs only on libs. An app can't import another app.
- npm is the only package manager, with one lockfile.

## Alternatives rejected

- **A repository per app.** Not recorded at the time. It would mean publishing `libs/ui` as a versioned package and keeping two apps' copies of it in step, which is the drift the shared library exists to prevent.
- **Copying shared components into each app.** Rejected by the lint rule itself: two apps would grow two Buttons.

## Consequences

- A change to `libs/ui` rebuilds and redeploys both `web` and `ops` (see the path filters in `deploy.prod.yml`).
- `nx affected` can run only what a change touches. The pre-push hook uses it against `origin/dev`.
- On a fresh clone, editors report `TS6305` until `libs/ui` declarations have been built once (`npx nx build @squadup.in/ui`).
