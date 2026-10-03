# Architecture decision records

One file per decision. Each records the context, the decision, what was rejected, and what it costs. Write one when someone is likely to ask "why is it like this?" a year from now.

Status values: `proposed`, `accepted`, `superseded by ADR-XXXX`, `deprecated`.

ADRs 0001–0005 were written after the fact, to record decisions the code had already made. Their reasoning comes from the code and its comments; where a rejected alternative wasn't written down at the time, the ADR says so.

| ADR                                                  | Decision                                                           | Status   |
| ---------------------------------------------------- | ------------------------------------------------------------------ | -------- |
| [0001](./0001-nx-monorepo.md)                        | One Nx monorepo, with the design system as a shared library        | accepted |
| [0002](./0002-modular-monolith-api.md)               | One NestJS API made of feature modules                             | accepted |
| [0003](./0003-separate-staff-realm.md)               | Staff are a separate identity realm from customers                 | accepted |
| [0004](./0004-audit-pipeline.md)                     | Audit events go through RabbitMQ into MongoDB                      | accepted |
| [0005](./0005-single-host-compose-caddy.md)          | One Docker Compose stack on one host, behind Caddy                 | accepted |
| [0006](./0006-project-challenges-grade-snapshots.md) | Project challenges grade a submitted snapshot on a separate grader | proposed |
| [0007](./0007-coding-board-yjs-rooms.md)             | The coding board syncs one Yjs document per room through the API   | accepted |
| [0008](./0008-react-sandbox-sandpack.md)             | The React sandbox runs on Sandpack's bundler and saves projects    | accepted |

## Writing a new one

Copy [template.md](./template.md) to `NNNN-kebab-title.md` with the next number, and add it to the table above in the same PR. Once accepted, an ADR isn't edited to change its decision. Write a new ADR that supersedes it and update the old one's status.
