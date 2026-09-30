# ADR-0006: Project challenges grade a submitted snapshot on a separate grader, starting with frontend and SQL

**Status:** proposed · **Date:** 2026-09-29

## Context

SquadUp wants challenges and arenas beyond algorithm problems: students building a UI, writing SQL, and later building APIs and doing DevOps work, on the platform, seeing their work run live, with no AI doing it for them.

The code runner planned for Milestone 3 is stateless: it runs one file and returns its output. It can't host a UI preview, a database or a running server. Untrusted code must never run on the API host (ADR-0005), and there is one small budget.

The full design is in [docs/project-challenges.md](../project-challenges.md).

## Decision

- **Two loops, never mixed.** The dev loop (live preview, query results) is untrusted and never scores anything. A score only comes from grading an immutable snapshot of the submitted files, built fresh in a disposable sandbox against hidden tests.
- **Frontend and SQL first**, because their dev loop runs entirely in the browser: esbuild-wasm with a sandboxed, opaque-origin iframe for frontend, and PGlite for SQL. No per-student server is needed.
- **A new grader**, `apps/grader`, consumes jobs from RabbitMQ and runs each one in a gVisor container with no network and resource limits, on a **separate grader host** reached over WireGuard. There is one image per track (`grader-frontend` with Playwright, `grader-sql` with PGlite).
- **Challenge packs:** every project challenge is a versioned, immutable pack (starter files, sample tests, hidden tests, reference solution). A pack publishes only if its reference solution passes every test and its starter fails at least one.
- **Monaco** is the editor for every track, so proctoring keeps control of paste and keystroke events.
- Backend and DevOps tracks, which need a server-side workspace per student, are deferred to their own ADR.

## Alternatives rejected

- **Grading the live dev environment.** The student controls it, so its results can be faked.
- **Extending the stateless code runner.** It has no way to serve a UI or keep a database across statements, and changing it affects another product that shares it.
- **A server-side container per student for frontend and SQL.** It works, but costs a server-side workspace per concurrent student for tracks the browser can run for free.
- **Embedding a hosted IDE (code-server, OpenVSCode Server).** Fast to ship, but proctoring loses control of paste and keystroke events.
- **Running grading on the API host.** Breaks the rule that untrusted code stays off the host holding user data.

## Consequences

- One more host to run: patched, monitored and paid for. It stays stateless so it can be rebuilt from scratch.
- The browser and the grader must bundle identically. One shared config and pinned versions keep them in step.
- Monaco, esbuild-wasm and PGlite add several MB each and must load only on challenge pages.
- The preview runs in an opaque origin, so `localStorage`, cookies and same-origin APIs are unavailable there without shims.
- The pack format and grader are the base the later backend and DevOps tracks build on.
