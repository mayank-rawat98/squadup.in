# Project challenges: frontend, SQL and beyond

**Status:** proposed · **Date:** 2026-09-29 · **Decision record:** [ADR-0006](adr/0006-project-challenges-grade-snapshots.md)

SquadUp's challenges and arenas shouldn't stop at algorithm problems. Students should build real things on the platform: a UI, an API, a query, a Dockerfile. They should see their work running as they build it, and be graded on it, with no AI doing it for them.

This document covers how that works, which tracks come first, and how the first two (frontend and SQL) get built. Nothing here is built yet.

---

## 1. The core idea: two loops, never mixed

Every project challenge has two separate loops.

| Loop         | What it's for                                                                    | Where it runs                                                        | Trusted? |
| ------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------- |
| **Dev loop** | Live preview, console, query results while the student works                     | As close to the student as possible, in their browser when it can be | No       |
| **Grading**  | The score. A snapshot of the files, built fresh and run against **hidden tests** | A disposable sandbox on a grader host, never the API host            | Yes      |

The student controls everything in the dev loop, so nothing in it counts towards a score. The only result that counts comes from grading a submitted snapshot. This is the same split as "Run" and "Submit" for algorithm problems in Milestone 3:

- **Run** grades the snapshot against the **sample** tests the student can read.
- **Submit** grades it against **all** tests, including hidden ones.

The existing code runner (stateless, "run this file, return stdout") stays for algorithm problems. It can't host a UI or a database, so project challenges get their own grader (§5).

---

## 2. Tracks

| Track                 | Dev loop                                                                                        | Grading                                                                                           | Infra cost | When                           |
| --------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------- | ------------------------------ |
| **Frontend**          | In the browser: bundle with esbuild-wasm, preview in a sandboxed iframe                         | Playwright specs in headless Chromium on the grader                                               | Low        | **First**                      |
| **SQL**               | In the browser: PGlite (Postgres compiled to WASM)                                              | The same query run against hidden datasets on the grader, results compared with a reference query | Very low   | **First**                      |
| Debugging and bug-fix | Either of the above, starting from a broken project                                             | "Make these failing tests pass", graded the same way                                              | Low        | With the first two, as content |
| Code review           | A read-only diff view with line comments                                                        | Found issues matched against a key, plus human review                                             | None       | Soon after                     |
| Backend (APIs)        | A server-side workspace per attempt: terminal, hot reload, a request panel, optional public URL | Black-box HTTP tests against a fresh build (any language)                                         | High       | Later (§7)                     |
| DevOps, config tasks  | Editor only: Dockerfile, compose, k8s, CI YAML, nginx                                           | Static checks (`hadolint`, `kubeconform`), `docker build` plus assertions                         | Low–medium | Later (§7)                     |
| DevOps, break-fix     | A broken server in a microVM, fixed through a terminal                                          | Check scripts inspect the final state                                                             | Highest    | Last (§7)                      |
| Data and ML           | Pyodide or JupyterLite in the browser                                                           | Hidden-data evaluation on the grader                                                              | Low        | Later                          |
| System design         | Whiteboard (Milestone 5) plus a written answer                                                  | Rubric, reviewed by people                                                                        | None       | Later                          |

Frontend and SQL come first because their dev loop runs entirely in the browser. They need no per-student server, and the only new infrastructure is the grader.

---

## 3. Frontend track

### What a challenge looks like

- **Build to spec:** "Build an accessible tabs component with keyboard support."
- **Fix a broken UI:** "The cart total is wrong and the layout breaks at 360px."
- **Match a design:** a screenshot plus behaviour requirements.
- **Consume data:** a mocked API served inside the preview, with no real network.

Version 1 supports **vanilla HTML/CSS/JS** and **React with TypeScript**. Other frameworks come later if the content needs them.

### Dev loop (in the browser)

```
Monaco editor (multi-file, file tree)
   │  files in memory, debounced ~300 ms
   ▼
Web Worker: esbuild-wasm bundles the project
   │  dependencies are pre-bundled ESM files that the challenge pack lists,
   │  served from our CDN; there are no npm installs and no arbitrary imports
   ▼
<iframe sandbox="allow-scripts" srcdoc="…">   ← opaque origin, no allow-same-origin
   │  console.* and runtime errors are forwarded with postMessage
   ▼
Console panel and error overlay in the challenge page
```

- **Isolation without a new domain:** an iframe with `sandbox="allow-scripts"` and no `allow-same-origin` runs in an opaque origin. The student's code can't read SquadUp cookies, storage or the parent page. The catch is that `localStorage` throws inside the preview, so tasks that need it get a small in-memory shim injected by the bundler.
- **No network from the preview:** a Content-Security-Policy in the `srcdoc` (`connect-src 'none'`, with scripts and styles only from our CDN) stops the preview from calling out, including to AI APIs.
- **Autosave:** the working copy is kept in IndexedDB for crash recovery and sent to the server as a snapshot every few seconds. The snapshots also feed the Milestone 4 replay timeline.

### Grading

1. The API stores the submitted files as an immutable snapshot in MinIO and queues a grading job.
2. The grader starts a `grader-frontend` container (§5) with the snapshot and the challenge's test files mounted read-only.
3. Inside it, native esbuild bundles the project **with the same config as the browser**, and a static HTML page is produced.
4. Playwright runs the specs in headless Chromium against that page, with all network requests blocked.
5. The JSON reporter's output becomes per-test results. The score is the weighted sum of passing tests.

Accessibility checks (axe-core) can be written as ordinary tests in a challenge. That's a good fit for a platform that holds itself to WCAG 2.2 AA.

Screenshot diffing is left out of version 1: it's flaky across font rendering and hard to make fair.

### Limits (starting values, tuned later)

- Up to 30 files and 256 KB of source per project.
- Grading times out at 60 seconds per job.
- Run is rate-limited per user (for example 1 per 10 seconds), and Submit more tightly.

---

## 4. SQL track

### What a challenge looks like

- **Query:** "Find the top three customers by revenue in each region, ties included."
- **Schema and migration:** "Add an orders table with the right keys and constraints." Graded by checker queries against the final state.
- **Later, performance:** "Make this query use an index." Graded on the `EXPLAIN` plan.

The dialect is Postgres, since PGlite is real Postgres compiled to WASM, which matches what students will meet at work.

### Dev loop (in the browser)

- PGlite runs in a Web Worker, loaded lazily on SQL pages only (it's a few MB).
- The pack's schema and **sample** dataset are loaded on start. A "Reset database" button reloads them.
- A results grid, row counts, errors with line numbers, and an `EXPLAIN` view.
- A statement timeout keeps a runaway query from freezing the tab.

### Grading

1. The grader starts a `grader-sql` container with PGlite in Node.
2. For each **hidden dataset** in the pack (different rows from the sample, with edge cases: `NULL`s, ties, empty groups, duplicates):
   - Load the schema and the dataset into a fresh in-memory database.
   - Run the pack's reference query and the student's query.
   - Compare the results by the pack's rules: ordered or unordered, and whether column names must match. Comparisons are exact; where rounding matters, the statement says how to round.
3. Each dataset is one test. Because the hidden data differs from the sample, hard-coding the expected output doesn't pass.

Schema tasks run the student's statements, then the pack's checker queries, which must each return `true`.

---

## 5. Shared pieces

### Challenge pack format

Every project challenge, whatever its track, is one versioned **pack**. Authors upload it as a zip through ops. The published version is immutable: changing a challenge means publishing a new version, so past scores stay reproducible.

```
pack.json            kind, version, title, difficulty, tags, limits,
                     editable file globs, dependency list, test weights
statement.md         shown to the student
starter/             the files the student starts from
tests/sample/        visible to the student, used by Run
tests/hidden/        never leaves the server, used by Submit
reference/           the author's solution, never leaves the server

SQL packs also have:
schema.sql
data/sample.sql
data/hidden/*.sql    one file per hidden dataset
reference.sql
checks/*.sql         for schema tasks
```

**Pack self-test:** on upload, the grader runs the reference solution against every test. A pack is publishable only if the reference passes all of them and the starter fails at least one. That catches broken tests before students do.

### Grader service

```
API (NestJS) ──► RabbitMQ "grading" queue ──► grader worker (grader host)
    ▲                                          │  per job: a disposable container
    │                                          │  runtime: gVisor (runsc)
    │                                          │  --network none, read-only root,
    │                                          │  memory, CPU and PID limits, tmpfs workdir
    └──── "grading.results" queue ◄────────────┘
                                    │
                                    ▼
                  Socket.IO pushes the result to the student
```

- **New Nx app `apps/grader`:** a small Node worker. It consumes jobs, fetches the snapshot and pack from MinIO, runs one container per job from a per-track image (`grader-frontend` with Playwright and Chromium, `grader-sql` with PGlite), and publishes results.
- **A separate grader host**, never the API host, because student code runs there. It reaches RabbitMQ and MinIO over WireGuard. This follows the same rule as the code runner decision: untrusted code stays off the host that holds user data.
- **Capacity:** a headless Chromium job needs roughly 300–500 MB, so a 4–8 GB host runs 2–4 frontend jobs at once. SQL jobs are far lighter. The queue absorbs bursts, and the arena lifecycle already has a "judging" phase for the end-of-contest spike.
- **Retries:** only for infrastructure failures (container failed to start, host restart). A test failure is a result, never a retry.
- **Determinism:** challenge tests must not depend on timing or order. Pack review checks for it.

### API (new `challenges` feature, shared with Milestone 3)

- **Entities:** `challenge` (with a `kind`: `algorithm`, `frontend` or `sql`), `challenge_version` (the pack's MinIO key and metadata), `submission` (snapshot key, `mode` of run or submit, status `queued` → `running` → `graded` or `error`, score) and `submission_test_result`.
- **Public endpoints:** get a challenge's public parts (statement, starter files, sample tests or sample data, limits); create a submission (Run or Submit); get a submission's result. All are rate-limited. Hidden tests and reference solutions are never in a response.
- **Ops endpoints** under `admin-ops/challenges`: upload a pack, see the self-test result, publish a version.

### Editor

Monaco, shared by every track and by algorithm problems. A project needs multiple files and a file tree, and proctoring needs control over paste and keystroke events. That rules out embedding a hosted IDE (code-server, OpenVSCode): we'd hand away the very events proctoring depends on.

### Proctoring hooks

Project challenges use the same Milestone 4 proctoring. Two additions help here:

- **Snapshot timeline:** autosaved snapshots let a reviewer replay how the project was built. A finished component appearing in one step is a strong signal.
- **Paste blocking** applies to the whole file tree, not just one editor.

---

## 6. Build plan: frontend and SQL

This is the Milestone 3 work for project challenges, in order. Each step is its own issue and PR.

| #   | Step                                                                                                 | Depends on |
| --- | ---------------------------------------------------------------------------------------------------- | ---------- |
| P1  | Decisions confirmed (§8), this doc and ADR-0006 accepted                                             | —          |
| P2  | Workspace shell in `apps/web`: Monaco, file tree, tabs, IndexedDB autosave, paste blocking           | P1         |
| P3  | Frontend preview engine: esbuild-wasm worker, sandboxed iframe, CSP, console panel, error overlay    | P2         |
| P4  | SQL playground: PGlite worker, results grid, reset, statement timeout, `EXPLAIN`                     | P2         |
| P5  | Challenge pack format: schema, validator and zip parser, with unit tests                             | P1         |
| P6  | `apps/grader` worker, `grader-frontend` and `grader-sql` images, RabbitMQ queues                     | P5         |
| P7  | Grader host: VPS, WireGuard, gVisor, deploy workflow, Prometheus metrics                             | P6         |
| P8  | API `challenges` module: entities, migration, public and ops endpoints, result events over Socket.IO | P5, P6     |
| P9  | Challenge page for both kinds: Run, Submit, per-test results; `loading.tsx` and `error.tsx`          | P3, P4, P8 |
| P10 | Ops: pack upload, self-test result, publish                                                          | P8         |
| P11 | First content: 5 frontend and 5 SQL challenges, easy to hard                                         | P10        |

P2–P4 need no backend, so they can start straight away and be tried locally with a hard-coded pack.

### New dependencies and why

| Package                                  | Why nothing existing does the job                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| `monaco-editor` (and a React wrapper)    | There's no editor in the stack. It's already the planned choice for Milestone 3.     |
| `esbuild-wasm` (web), `esbuild` (grader) | Bundling TypeScript and JSX in the browser, with the same bundler on the grader.     |
| `@electric-sql/pglite`                   | Real Postgres in the browser and in the grader, with no database server per student. |
| `@playwright/test` (grader image only)   | Driving a real browser to test UI behaviour. It never ships to users.                |

All of them load lazily on challenge pages only, so they don't touch the landing page's bundle size.

---

## 7. Later: backend and DevOps tracks

These need a **server-side workspace** per attempt, which is a different system from the grader. It's recorded here so the first two tracks don't paint it into a corner.

- **Workspace:** a container per attempt (gVisor) or microVM (Firecracker, needed for DevOps because Docker-in-Docker requires privileged mode). The editor syncs files to it, a terminal runs over WebSocket (xterm.js), and a dev server hot-reloads. E2B (open source, self-hostable Firecracker sandboxes with exposed ports) should be evaluated before writing an orchestrator.
- **Seeing the API live:**
  - An in-platform request panel (a small Postman) first.
  - A public URL second, and only with limits: a **separate registrable domain** (never under `squadup.in`, to protect cookies and domain reputation), live only during the attempt, a per-attempt token, and a time limit. Public URLs running untrusted code attract crypto mining, phishing and open proxies.
- **No outbound network** from workspaces, or code can call an AI API or download a solution. Dependencies come pre-installed in the template image or through an allowlisted package mirror (Verdaccio for npm, devpi for pip).
- **Grading** is still a fresh build of a snapshot, never the live workspace: black-box HTTP tests (Hurl or supertest) for backend, check scripts on final state for DevOps.
- **Cost** is the real constraint: 100 concurrent backend students needs roughly 25–50 GB of RAM for workspaces alone. Idle suspension and snapshots help. This needs its own ADR and a budget decision.

---

## 8. Open decisions

1. **Bundler for the frontend preview:** esbuild-wasm with our own worker (proposed: full control, no third-party runtime, same bundler on the grader), or Sandpack (faster to start, but its bundler is hosted by CodeSandbox unless we self-host it).
2. **Grader host:** a new small VPS for SquadUp grading (proposed), and its size.
3. **Frameworks in version 1:** vanilla and React (proposed), or more.
4. **Where this sits in the roadmap:** as challenge kinds inside Milestone 3 (proposed), so Milestone 4 arenas get them for free.

## 9. Risks

- **Grader host operations:** one more host to patch, monitor and pay for. Mitigated by keeping it stateless: it can be rebuilt from scratch.
- **Flaky UI tests** undermine trust in scores. Mitigated by the pack self-test, deterministic-test review, and no screenshot diffing in version 1.
- **Bundle weight:** Monaco, esbuild-wasm and PGlite are each several MB. Mitigated by lazy loading on challenge pages only and caching by the service worker or HTTP cache.
- **Dev-loop and grader drift:** if the browser and the grader bundle differently, a working preview can fail grading. Mitigated by one shared bundler config and pinned versions in both places.
- **Opaque-origin preview limits:** no `localStorage`, cookies or same-origin APIs in the preview. Mitigated by shims, and by choosing tasks that don't need them.
