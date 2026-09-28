# CLAUDE.md

Guidance for Claude Code (and anyone else) working in this repository. Read it fully before making changes. Keep it short, current and specific. If a rule here conflicts with an explicit instruction in the chat, the chat wins; flag the conflict.

---

## 1. Project

**SquadUp** (squadup.in) is a real-time platform where student developers code, compete and build together, alone or as a squad. Arenas are proctored so that the work is the student's own, not an AI's. See [README.md](README.md) for the pillars and [ROADMAP.md](ROADMAP.md) for what is built next.

**What must never break:** a user's account security (sign-in, 2FA, passkeys, sessions) and, once arenas ship, a live arena attempt.

| Layer          | Tech (as built, not as planned)                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------- |
| Backend        | NestJS 11 on Express, REST under `/api/v1`, Socket.IO gateways, Swagger (basic-auth gated)      |
| Frontend       | Next.js 16 (App Router), React 19, Tailwind CSS 4, `tailwind-variants`, `motion/react`, lucide  |
| Data           | PostgreSQL via **TypeORM** (migrations only, `synchronize: false`), Redis                       |
| Audit pipeline | RabbitMQ (with a dead-letter queue) → MongoDB (Mongoose)                                        |
| Storage        | MinIO (S3-compatible), served through the CDN domain                                            |
| Auth           | JWT access/refresh, passkeys (WebAuthn), TOTP 2FA, Google sign-in; a separate staff identity    |
| Infra          | Docker images on GHCR, one Docker Compose stack on a VPS behind **Caddy**, Prometheus + Grafana |
| CI/CD          | `ci.yml` on PRs into `dev`/`main` and pushes to `dev`; `deploy.prod.yml` on push to `main`      |
| Monorepo       | **Nx 23**, npm workspaces. Node ≥ 24, npm ≥ 11                                                  |
| Package mgr    | **npm only.** Never use pnpm or yarn, and never commit another lockfile                         |

### Repository layout

```
apps/
  api/        NestJS API, one folder per feature (src/<feature>/)
  web/        Next.js customer app and landing page (squadup.in), port 3001
  ops/        Next.js operations console for staff (ops.), port 3002, scaffolded
  api-e2e/    Jest e2e against a running API
  web-e2e/    Cypress e2e for web
libs/
  ui/         Design system: atoms / molecules / organisms, styles/index.css tokens, cn() and tv()
docker/       One Dockerfile per app (api, web, ops) + prometheus config
caddy/        Caddyfile: TLS and one site block per subdomain
compose.yml   Production stack (profile: production)
compose.dev.yml  Local Postgres, Redis, MongoDB, RabbitMQ, MinIO (profile: development)
tools/        Repo scripts (sync-labels.sh)
docs/         adr/ (decision records), frontend-conventions.md
.github/      workflows/, ISSUE_TEMPLATE/, pull_request_template.md
```

**Frontend app shape** (`apps/{web,ops}/src`): `app/` for routes (use route groups as they appear, e.g. `(auth)`), `features/<feature>/` for feature components, hooks, types and constants, `components/` for app-only shell pieces (header, footer, logo), `config/` for app constants such as navigation, and `lib/` for app infrastructure (the API client in `lib/api/`, the session in `lib/auth/`, per ROADMAP.md §1.1). Shared primitives go in `libs/ui`, never copied into an app. The details are in [docs/frontend-conventions.md](docs/frontend-conventions.md).

**Module boundaries** are enforced by ESLint's `@nx/enforce-module-boundaries`: `type:app` may depend only on `type:lib`. Apps never import each other.

### Commands

Always use these instead of guessing. Projects are named `@squadup.in/<dir>`.

```sh
npm install                              # install (npm only); also installs the git hooks
cp .env.example .env.local               # local config; defaults work as-is
npm run docker:up                        # local Postgres, Redis, MongoDB, RabbitMQ, MinIO
npm run migration:run                    # apply TypeORM migrations
npx nx serve @squadup.in/api             # API on :8080, Swagger at /api/docs
npx nx serve @squadup.in/web             # web on :3001
npx nx serve @squadup.in/ops             # ops on :3002
npx nx test @squadup.in/<project>        # unit tests (Jest)
npx nx e2e @squadup.in/web-e2e           # Cypress e2e
npm run check:affected                   # lint/typecheck/test/build vs origin/dev (the pre-push hook)
npm run check                            # the same over every project (what CI runs)
npm run format                           # Prettier
npm run migration:generate -- apps/api/src/database/migrations/<Name>
bash tools/sync-labels.sh                # GitHub labels (needs gh auth)
```

**Git hooks (husky):** `commit-msg` runs commitlint, `pre-commit` runs lint-staged (Prettier, then ESLint `--fix`), and `pre-push` runs `check:affected`. Never bypass them with `--no-verify`; fix the cause. Details are in CONTRIBUTING.md §5.

---

## 2. How you work

You act as a **senior full-stack engineer** and a **senior DevOps engineer**. Switch hats explicitly when a task crosses the boundary (e.g. "new API subdomain → also update the Caddyfile and compose.yml").

### Workflow for every non-trivial task

1. **Explore:** read the relevant modules, tests and configs first. Search for existing utilities before writing new ones.
2. **Plan:** for anything touching more than ~3 files, a public API, the DB schema or infra, write a short plan (files to change, approach, risks, migration and rollback) and wait for approval.
3. **Implement:** small, focused diffs. One concern per change.
4. **Verify:** run lint, typecheck and the relevant tests. For infra changes, build the image and validate the config (`docker compose config`, `caddy validate`).
5. **Report:** summarise what changed, why, what you verified, and anything left unverified or risky.

### Ground rules

- Never invent APIs, env vars, file paths or package versions. Check the code or docs.
- Ask when requirements are ambiguous; don't silently pick an interpretation on high-impact decisions.
- Don't describe unbuilt features as shipped. ROADMAP.md and README's status table say what exists.
- Don't refactor unrelated code in the same change. Note it as a follow-up issue instead.
- Don't add dependencies without saying why an existing one or a few lines of code won't do.
- Never weaken tests, lint rules or type safety to make something pass.
- Never commit secrets, `.env*` files (other than `.env.example`) or real credentials. Never print secrets in logs.
- Destructive operations (dropping data, force-pushing, deleting volumes, running prod migrations) need explicit confirmation.

---

## 3. Engineering principles

### SOLID, applied concretely

- **S: Single responsibility.** Controllers handle HTTP only (validation, mapping, status codes). Services hold business logic. Repositories handle persistence. React components render; hooks handle data and side effects.
- **O: Open/closed.** Extend behaviour with new providers, guards, interceptors, strategies or composition, not with more `if/else` branches in core logic.
- **L: Liskov substitution.** Any implementation of an interface (e.g. a search provider) must be swappable without its callers changing.
- **I: Interface segregation.** Small, role-specific interfaces and props. No god-services, no components with 20 optional props.
- **D: Dependency inversion.** Depend on abstractions through NestJS DI. Never `new` a service inside another service. On the frontend, pass data in through props or context rather than hard-wiring fetches deep in the tree.

### DRY, with judgement

- Extract shared logic on the **third** repetition, not the first.
- Config and constants are centralised (`apps/api/src/config`, `apps/api/src/constants`, a feature's `constants/`). No magic strings or numbers.
- Don't DRY things that merely _look_ similar but change for different reasons. That's coupling, not reuse.

### Also

- **KISS / YAGNI:** build what's needed now; no speculative abstraction layers.
- **Fail fast:** validate input at the boundary and throw typed errors early.
- **Explicit over clever:** readable code beats short code.
- **Immutability by default:** `const`, `readonly`, no mutation of arguments.

---

## 4. TypeScript

- `strict: true`. No `any` (use `unknown` and narrow). No non-null `!` unless a comment justifies it.
- `type` for unions and utility types, `interface` for object contracts that are implemented or extended.
- Named exports. Default exports only where the framework requires them (Next.js pages and layouts) and for `libs/ui` components, which are re-exported by name from their barrel.
- `async/await` only. Always handle or propagate rejections; no floating promises.
- Naming: files `kebab-case.ts` in the API, React components `PascalCase.tsx`; classes `PascalCase`; functions and variables `camelCase`; constants `SCREAMING_SNAKE_CASE`.
- Functions do one thing. Early returns over nested conditionals.
- Comments explain **why**, not what. Public functions get TSDoc when the behaviour isn't obvious.

---

## 5. Backend: NestJS

### Structure

One feature = one module, directly under `apps/api/src/` (there is no `modules/` folder):

```
apps/api/src/<feature>/         e.g. blogs/, users/, settings/, feature-flags/
  <feature>.module.ts
  <feature>.controller.ts       HTTP only
  <feature>.service.ts          business logic
  <feature>.repository.ts       persistence only (TypeORM Repository)
  <feature>.presenter.ts        maps entities to response shapes (e.g. blogs/blog.presenter.ts)
  dto/                          class-validator input DTOs
  entities/                     TypeORM entities
  swagger/                      Swagger decorators and examples, kept out of the controller
  constants/
  <feature>.service.spec.ts     specs sit next to the file they test
```

Larger features split into `controllers/`, `services/` and `repositories/` folders (see `notifications/`, `feature-flags/`). Staff-only authoring routes live under `admin-ops/<feature>/`, separate from the public routes.

Shared pieces: `common/` (guards, interceptors, middleware, DTOs), `filters/` (global exception and validation filters), `decorators/` (guard and rate-limit decorators), `config/` (env loading), `database/` (data source and migrations), `utils/`.

### Rules

- **Validation:** the global `ValidationPipe` in `main.ts` runs with `whitelist`, `forbidNonWhitelisted`, `transform` and `forbidUnknownValues`. Every input is a class-validator DTO.
- **Responses:** never return entities directly. Map them through a presenter or response DTO, and never leak password hashes, secrets, internal-only fields (e.g. `createdById`) or stack traces. The response shape in use is `{ success, data, message }`, with `currentPage`, `itemsPerPage`, `totalItems` and `totalPages` on lists. Keep new endpoints consistent with it.
- **Errors:** throw Nest `HttpException` subclasses. The global `HttpExceptionFilter` maps them, plus JWT, Postgres constraint and Multer errors, to user-facing messages. Error messages say what happened and how to fix it.
- **Pagination:** every list endpoint is paginated. Use `findAllWithPagination` in `utils/query.utils.ts` with explicit allow-lists of filter and sort columns.
- **Config:** read env only in `apps/api/src/config/`, which fails fast on missing required values through `getRequiredEnv`. Import the typed constants from there. Don't scatter `process.env` through the code.
- **Auth:** guards for authentication and authorisation, deny by default. Customer and staff identities are separate (`auth/` vs `staff/`), with separate tokens; never let one stand in for the other.
- **Rate limits:** every public or auth endpoint carries a decorator from `decorators/throttler.decorator.ts` (`PublicRateLimit`, `SensitiveRateLimit`, `EmailRateLimit`…).
- **Database:** every schema change is a TypeORM migration in `apps/api/src/database/migrations/`. Use transactions for multi-write operations. Watch for N+1 queries. Index what you filter or sort on.
- **Audit:** security-relevant actions go through the audit pipeline (`audits/`, `AuditInterceptor`), not ad-hoc logging.
- **Logging:** Nest `Logger`, never `console.log`. Never log tokens, passwords, OTPs or full request bodies.
- **API:** versioned (`@Controller({ version: '1', path })`), documented with `@nestjs/swagger`, plural resource nouns, correct status codes.
- **Resilience:** timeouts on outbound HTTP (mailer, IP lookup, Google); retries with backoff only for idempotent calls.
- **Metrics:** `/metrics` via `@willsoto/nestjs-prometheus`, scraped by Prometheus. It is not exposed publicly.

---

## 6. Frontend: Next.js

The full conventions are in [docs/frontend-conventions.md](docs/frontend-conventions.md) and [libs/ui/README.md](libs/ui/README.md). The short version:

- **Server Components by default.** Add `'use client'` only for interactivity, browser APIs or client state, at the top of the file that needs it, pushed as far down the tree as possible.
- **Reuse `libs/ui` first.** A component that could serve both `web` and `ops` belongs in `libs/ui`. Atoms import only `utils`; molecules import atoms; organisms import both. No data fetching, sessions or business logic in `libs/ui`.
- **Tokens only.** Every colour, radius, shadow and type step comes from `libs/ui/src/styles/index.css`. Never a hex code in a component. Light and dark themes both work through tokens.
- **`tv` and `cn` come from `libs/ui/src/utils.ts`**, never straight from `tailwind-variants` or `tailwind-merge`. Register every new `@utility text-*` in `FONT_SIZE_SUFFIXES`.
- **Data access** goes through the app's one API client in `src/lib/api/`, wrapped by per-resource functions. No ad-hoc `fetch` sprinkled through components. Server state uses TanStack Query; forms use react-hook-form with zod. Validate on the server regardless of client validation.
- Every route segment that fetches has `loading.tsx` and `error.tsx`. Handle empty states explicitly.
- Use `next/image`, `next/font` and `next/link`. Set `metadata` for every page.
- Only `NEXT_PUBLIC_*` vars reach the browser; treat them as public.
- Watch bundle size: avoid large client-side libraries and lazy-load heavy components.

---

## 7. UI and design work

**Design source of truth is the current `libs/ui`:** violet primary (hue 262), light and dark themes, Inter only. Older product docs that describe a dark-first blue palette or Poppins are out of date; don't "fix" `libs/ui` towards them.

Design process:

1. Establish the purpose, audience and primary job of the screen. Use real content, not lorem ipsum.
2. For new screens, propose a compact design plan first (layout sketch, which `libs/ui` components, any new tokens) and get approval.
3. Build with design tokens. No hard-coded colours, sizes or shadows in components.
4. Reuse existing components from `libs/ui` before creating new ones, and match established screens.

Avoid the generic "AI-generated" look: purple/blue gradients as decoration, identical rounded cards with the same soft shadow everywhere, ALL-CAPS eyebrow labels over every heading, and fade-up animations on every section. Spend boldness in one place; keep the rest quiet.

Quality floor (non-negotiable):

- **Accessibility:** WCAG 2.2 AA. Semantic HTML, labelled inputs, visible keyboard focus, sufficient contrast, alt text, ARIA only where semantics fall short, `prefers-reduced-motion` respected. Status is a word as well as a colour.
- **Responsive:** mobile-first, works from 320px up, no horizontal scroll.
- **States:** loading, empty, error, success and disabled are all designed.
- **Copy:** sentence case, active voice, buttons say what they do ("Save changes", not "Submit"), and errors say what happened and how to fix it.

---

## 8. Testing

- Unit tests (Jest) for services, repositories, guards, utilities, and non-trivial hooks and components. Mock at boundaries (repositories, HTTP), not internals.
- API e2e lives in `apps/api-e2e`, web e2e (Cypress) in `apps/web-e2e`. Don't claim e2e coverage for a flow that has no spec.
- New feature → tests. Bug fix → a failing test that reproduces it first, then the fix.
- Tests are deterministic: no real network, no reliance on wall-clock time or test order.
- Test behaviour, not implementation details. Descriptive names: `it('returns 404 when the post is a draft')`.
- Assert exactly. A test that allows tolerance hides the bug inside the tolerance.

---

## 9. DevOps

### Docker

- Multi-stage builds (`deps` → `builder` → `production`) on pinned `node:24-alpine`. Only production deps in the final stage.
- Third-party images in `compose.yml` are pinned. No `latest` for anything we don't build.
- Run as a non-root user where the image allows it. Handle `SIGTERM` for graceful shutdown.
- Keep `.dockerignore` current (node_modules, .git, .env\*, dist).
- Config via env vars; secrets never baked into images or build args.

### Docker Compose

- `compose.dev.yml` (local backing services, profile `development`) and `compose.yml` (production, profile `production`).
- Services reach each other by **service name** (`server`, `client`, `ops`, `postgres`…), never by container name.
- `depends_on` with `condition: service_healthy`, named volumes for data, internal networks. Only Caddy is public.

### Caddy

- Caddy is the only public entry point: automatic TLS and one site block per subdomain (web, `www` redirect, ops, api, cdn, minio console, metrics), driven by env vars in `caddy/Caddyfile`.
- A new public service means a Caddyfile block, a compose service and the env vars for its domain, in the same PR.
- Validate with `caddy validate` before deploying a change.

### CI/CD

- `ci.yml` runs `nx run-many -t lint test build typecheck` on PRs into `dev` and `main` and on pushes to `dev`. The `ci` check gates merges into `main`.
- `deploy.prod.yml` on push to `main`: detect changed services → build and push images tagged with `latest` and the git SHA → run migrations in a one-off container → deploy. A failed migration blocks the deploy.
- Migrations must be backward-compatible with the running version (expand → migrate → contract), because they run before the new images take traffic.

### Observability and config

- Prometheus scrapes the API; Grafana sits on the metrics domain. There is no error tracker yet.
- Document every new env var in `.env.example` with a placeholder and a comment. No undocumented config.

---

## 10. Security checklist (apply on every change)

- Validate and sanitise all input; parameterised queries only (TypeORM parameters, never string-built SQL).
- Authorisation on every protected resource, including ownership checks (no IDOR).
- Passwords hashed with bcrypt. Short-lived access tokens, rotating refresh tokens, `httpOnly` `secure` `sameSite` cookies.
- CORS restricted to `allowedOrigins` in `config/`. Helmet stays on.
- Rate-limit every public and auth endpoint.
- Dependencies: no known-vulnerable packages; run `npm audit` on dependency changes.
- Follow the OWASP Top 10. Least privilege for DB users, containers and credentials.

---

## 11. Git

Full conventions are in **[CONTRIBUTING.md](CONTRIBUTING.md)**. In short, one `type(scope)` follows the work from issue to branch to commits to PR:

- **Issues:** `<type>(<scope>): <summary>`, e.g. `fix(auth): verification link opens a 404`, with one `type:` label and at least one `area:` label. Use the templates in `.github/ISSUE_TEMPLATE/`. Adding a scope means updating CONTRIBUTING.md, `commitlint.config.cjs` and `tools/sync-labels.sh` together.
- **Branches:** `<type>/<issue#>-<kebab-slug>`, e.g. `feat/12-sign-in-page`, created from a freshly fetched `origin/dev` (`git fetch origin && git switch -c <branch> origin/dev`), never from `main`.
- **Commits:** Conventional Commits with the same scopes, e.g. `feat(web): …`, `fix(api,auth): …`.
- **Flow:** feature branch → `dev` → `main` (production deploy).
- **PRs:** the title matches the issue, the body has `Closes #<n>`, and the PR template is filled in (what, why, verification, screenshots, rollback).
- Never commit directly to `main`. Never force-push shared branches.

---

## 12. Definition of done

- [ ] Follows the structure and principles above
- [ ] Lint, typecheck and tests pass locally (`npm run check:affected`)
- [ ] Tests added or updated for the change
- [ ] No secrets, debug logs, commented-out code, or TODOs without an issue link
- [ ] Swagger and `.env.example` updated if applicable
- [ ] UI: accessible, responsive, all states handled, light and dark checked
- [ ] Infra: config validated, image builds, rollback path known
- [ ] Summary written: what changed, why, how verified, open risks
