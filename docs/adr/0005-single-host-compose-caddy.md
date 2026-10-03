# ADR-0005: One Docker Compose stack on one host, behind Caddy

**Status:** accepted (recorded retroactively) · **Date:** 2026-09-22

## Context

SquadUp is early, with little traffic and a budget for one server. That server also hosts another project's stack (novagate).

## Decision

- Production is one Docker Compose stack (`compose.yml`, profile `production`) on one VPS: `server`, `client`, `ops`, Postgres, Redis, MongoDB, RabbitMQ, RustFS, Prometheus and Grafana.
- **Caddy** is the only process bound to ports 80 and 443. It obtains and renews TLS certificates on its own, so there are no certificate files to mount. It has one site block per subdomain, with hostnames from env vars, and it also fronts the other stack's sites through the external `novagate-edge` network.
- Services talk to each other by compose service name on internal networks. Only Caddy is public.
- `deploy.prod.yml` builds only the images whose paths changed, pushes them to GHCR tagged `latest` and with the git SHA, runs migrations in a one-off container, then runs `docker compose up -d`. A failed migration blocks the deploy.

## Alternatives rejected

- **Nginx with certbot.** Not recorded at the time. It would mean managing certificate renewal and mounting certificate files, which Caddy does by itself.
- **Kubernetes or a multi-node cluster.** Not justified at this size.

## Consequences

- The host is a single point of failure. A server outage takes the whole platform down until it's restored.
- The novagate stack has to be up before this one, or Caddy fails to start.
- Migrations run before the new images take traffic, so they must be backward-compatible with the running version (expand → migrate → contract).
- Scaling out later means moving stateful services off the host first. That will need its own ADR.
