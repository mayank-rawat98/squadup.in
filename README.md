# SquadUp

**Compete. Collaborate. Win together.**

SquadUp is a real-time platform where student developers code, compete and
build together, alone or as a squad. Live at [squadup.in](https://squadup.in).

AI can write most code today, which makes it easy to stop thinking for
yourself. SquadUp is built around the opposite idea: **solve it with your own
head**. All coding happens in the browser, inside a proctored environment, so
what you build and win is genuinely yours.

## What's in it

- **Arenas.** Compete solo or as a team against other teams. Arenas are
  proctored: tab and focus tracking, paste blocking, webcam and mic
  monitoring, and keystroke analysis to catch copied or AI-generated code.
- **Solo challenges.** Practice problems for learning at your own pace and
  climbing the leaderboards.
- **Coding board.** A shared workspace for coding with friends: a real-time
  editor with live cursors, chat, voice channels, a whiteboard and a React
  playground.
- **Real rewards.** Winners get real 3D-printed products from the SquadUp
  store, not just the usual swag, along with goodies like jackets and bottles.

## Status

SquadUp is in early development.

| Area                                                                                                | State      |
| --------------------------------------------------------------------------------------------------- | ---------- |
| Landing page and design system                                                                      | Built      |
| Accounts and security: passkeys, 2FA, Google sign-in, sessions                                      | Built      |
| Platform: staff and admin, feature flags, blogs, changelog, notifications, audit logs, file storage | Built      |
| Production infrastructure: Docker, Caddy, monitoring, CI/CD                                         | Built      |
| Operations console                                                                                  | Scaffolded |
| Arenas and proctoring                                                                               | Planned    |
| Solo challenges and leaderboards                                                                    | Planned    |
| Coding board: editor, chat, voice, whiteboard, playground                                           | Planned    |
| Rewards store                                                                                       | Planned    |

What's being built next, and how, is in [ROADMAP.md](ROADMAP.md).

This repository is the whole platform: the API, the customer web app, the
internal operations console, and the design system they share.

## Stack

| Layer          | Tech                                                       |
| -------------- | ---------------------------------------------------------- |
| Monorepo       | [Nx](https://nx.dev), npm workspaces, TypeScript (strict)  |
| API            | NestJS 11, TypeORM + PostgreSQL, Redis, Socket.IO          |
| Audit pipeline | RabbitMQ → MongoDB                                         |
| File storage   | MinIO (S3-compatible)                                      |
| Frontend       | Next.js 16 (App Router), React 19, Tailwind CSS v4, Motion |
| Auth           | JWT, passkeys (WebAuthn), TOTP 2FA, Google sign-in         |
| Ops            | Docker Compose, Caddy, Prometheus, Grafana, GitHub Actions |

## Projects

| Project           | Path       | Dev port | What it is                             |
| ----------------- | ---------- | -------- | -------------------------------------- |
| `@squadup.in/api` | `apps/api` | 8080     | NestJS API                             |
| `@squadup.in/web` | `apps/web` | 3001     | Next.js customer app                   |
| `@squadup.in/ops` | `apps/ops` | 3002     | Next.js operations console             |
| `@squadup.in/ui`  | `libs/ui`  | —        | Shared design system used by web + ops |

Anything both apps render belongs in `libs/ui`. ESLint's
`@nx/enforce-module-boundaries` blocks app-to-app imports, so sharing through
the library is the only route. See [libs/ui/README.md](libs/ui/README.md).

## Getting started

**Prerequisites:** Node.js 24, npm, and Docker with Compose.

```sh
git clone https://github.com/mayank-rawat98/squadup.in.git
cd squadup.in
npm install

# 1. Configure. The defaults work as-is for local development.
cp .env.example .env.local

# 2. Start Postgres, Redis, MongoDB, RabbitMQ and MinIO in the background
#    (waits until they're healthy). Stop them with `npm run docker:down`.
npm run docker:up

# 3. Create the database schema.
npm run migration:run

# 4. Run the apps (each in its own terminal).
npx nx serve @squadup.in/api
npx nx serve @squadup.in/web
npx nx serve @squadup.in/ops
```

Then open:

- Web app: <http://localhost:3001>
- Ops console: <http://localhost:3002>
- API docs (Swagger): <http://localhost:8080/api/docs>, log in with
  `SWAGGER_USER` / `SWAGGER_PASSWORD`
- RabbitMQ UI: <http://localhost:15672> · MinIO console: <http://localhost:9001>

Email, Google sign-in, SMS 2FA and IP lookup call third-party services. Their
keys are optional in `.env.example`; only those features fail without them.

## Common tasks

Every app uses the same target names:

```sh
npx nx serve @squadup.in/web       # dev server with HMR (also picks up libs/ui edits)
npx nx build @squadup.in/web       # production build
npx nx typecheck @squadup.in/web
npx nx lint @squadup.in/web
npx nx test @squadup.in/web

npx nx run-many -t lint test typecheck   # everything, everywhere
```

Database migrations:

```sh
npm run migration:generate -- apps/api/src/database/migrations/<Name>
npm run migration:run
npm run migration:revert
npm run migration:show
```

## Deployment

Production runs as a single Docker Compose stack behind Caddy. See
[compose.yml](compose.yml) for the list of variables `.env.production` must
define, and [.github/workflows/deploy.prod.yml](.github/workflows/deploy.prod.yml)
for the pipeline. Pushes to `main` build the images, run migrations and roll out.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first. To
report a security issue, follow [SECURITY.md](SECURITY.md) and do not open a
public issue.

## License

[MIT](LICENSE) © Mayank Rawat
