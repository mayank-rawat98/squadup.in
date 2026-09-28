# ADR-0002: One NestJS API made of feature modules

**Status:** accepted (recorded retroactively) · **Date:** 2026-08-02

## Context

The backend covers auth, users, staff, audits, notifications, feature flags, blogs, search, storage and more, with arenas, challenges, the coding board and the store still to come. It is built and run by a very small team on one host (ADR-0005).

## Decision

One NestJS application, `apps/api`. Each feature is a module directly under `apps/api/src/<feature>/`, with its own controller, service, repository, DTOs and entities. The only work that leaves the request path goes over RabbitMQ to consumers in the same codebase (ADR-0004).

Inside a module the layers are fixed: controllers handle HTTP, services hold business logic, repositories hold persistence, and presenters shape responses.

## Alternatives rejected

- **A service per domain.** Not recorded at the time. On one host it would add network hops, partial failure and a deploy pipeline per service, with none of the independent scaling that justifies them.

## Consequences

- One image, one migration path, one dependency tree.
- Module boundaries are a convention, not a process boundary. A module should read another's data through that module's exported service, not its repository or tables. Code review has to hold that line.
- If a domain ever needs to scale on its own (the code runner for arenas is the likely first), the module boundary is where it gets cut out.
