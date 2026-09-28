# ADR-0004: Audit events go through RabbitMQ into MongoDB

**Status:** accepted (recorded retroactively) · **Date:** 2026-08-02

## Context

Security-relevant actions (sign-ins, 2FA changes, staff actions, throttled requests) must be recorded, and staff must be able to search that record. Recording must never slow down or fail the request that caused it.

## Decision

- The API emits audit events with `AuditProducer`, fire-and-forget, with a 2-second timeout. A failure is logged and swallowed: "logging should never break the application".
- Events go to a RabbitMQ exchange and queue. `AuditConsumer` writes them to MongoDB (`audit-log.schema.ts`). Failed messages go to a dead-letter exchange and queue, handled by `AuditDlqConsumer`.
- The consumers run in the API process as Nest microservices (`connectMicroservice` in `main.ts`).
- Emitted events are counted in Prometheus.

## Alternatives rejected

- **Writing audit rows to Postgres in the request.** Not recorded at the time. It would put an extra write on every audited request and let an audit failure fail the action.

## Consequences

- Two more stateful services to run and back up: RabbitMQ and MongoDB.
- The audit log is eventually consistent. An event can be lost if the broker is unreachable for longer than the timeout. That is an accepted trade for never blocking a user.
- New audited actions go through the pipeline (`AuditInterceptor` or `AuditProducer`), never through ad-hoc logging.
