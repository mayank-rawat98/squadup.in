# ADR-0007: The coding board syncs one Yjs document per room through the API

**Status:** accepted · **Date:** 2026-10-04

## Context

The coding board (ROADMAP Milestone 5) is a room where a squad edits the
same code, sketches on a whiteboard and chats, live. Several people type into
the same file at once, so edits have to merge rather than overwrite, and each
person needs to see where the others are. ROADMAP listed three things to
decide before building: the CRDT library, the whiteboard engine and the voice
transport.

The rest of the platform is one NestJS API (ADR-0002) on one host (ADR-0005),
with Socket.IO already in use for notifications and Postgres as the system of
record. Rooms are found by a short ID that people read to each other.

## Decision

- **Yjs is the shared state.** Each room has one Yjs document holding a
  `Y.Text` per language (`code:<language>`), a `meta` map with the language
  everyone is looking at, and the whiteboard: a `pages` array of `{ id }`
  and one strokes array per page. The first page keeps the original
  `strokes` key (`strokes:<pageId>` for the rest), so rooms drawn in before
  pages existed open with their drawing as page 1. Which page you look at is
  presence, not shared state.
  Presence (who is where, carets, typing, drawing) is y-protocols awareness.
- **The editor is CodeMirror 6 with y-codemirror.next.** It is far lighter
  than Monaco and themes from the design tokens.
- **The whiteboard is our own canvas.** Finished strokes are plain objects in
  the document's `strokes` array. tldraw needs a paid licence key in
  production and Excalidraw's look clashes with `libs/ui`; the design needs
  five tools.
- **The API is the sync server.** A `/boards` Socket.IO namespace relays Yjs
  and awareness updates. It authenticates in middleware with the access token
  and checks room membership on open, the same rules as the REST routes.
  `BoardRoomsService` holds each open room's document in memory, saves it to
  `board_documents` as one encoded update (after a 2 s pause, at least every
  10 s, and when the last person leaves), and unloads it a minute later.
- **Rooms, members and chat are Postgres rows.** Membership is the access
  rule. Chat messages are stored and sent over the same socket.
- **Rooms last 7 days** (added 2026-10-04, #76). `boards.expiresAt` is set by
  a database default to creation + 7 days. Opening or joining after that
  answers 410, and an hourly job closes any live copy (`board:expired`,
  nothing saved back) and deletes the board; its document, members and chat
  cascade. The clock runs from creation, not last activity, so the limit is
  the same for everyone.
- **Downloading a page is client-side.** The browser redraws the page's
  strokes onto a canvas cropped to the drawing and saves a PNG; the API is
  not involved.
- **Voice is not decided yet.** It's left out of this first build.

## Alternatives rejected

- **Monaco with y-monaco.** About 2–3 MB on the client and harder to theme.
- **A separate y-websocket server.** Another service to deploy, secure and
  route in Caddy, with its own copy of the auth and membership rules. The API
  already has the socket, the token checks and the database.
- **Storing every update as a row.** Replaying a long history on open, and
  compaction to manage it. One snapshot per room is enough at this size.
- **Rooms and chat only in Redis.** Simpler, but rooms would vanish. The
  roadmap wants boards people come back to.

## Consequences

- Rooms live in the API process, so the API must stay a single instance
  (as ADR-0005 has it) until there are sticky sessions and a shared Socket.IO
  adapter. Scaling out means revisiting this.
- A deploy restarts the API and drops every socket. Clients reconnect, reopen
  the room and send anything typed meanwhile; edits saved before the restart
  are kept, and `onModuleDestroy` saves open rooms on a graceful shutdown.
- A document is capped at 4 MB, and a single update at 256 KB. A whiteboard
  stroke stores rounded points and skips near-duplicates to stay small.
- The web app and the API share the document's layout and the socket event
  names by convention (`board.constant.ts` and `board-socket.constants.ts`),
  not by a shared library. A change to one must change the other.
- Running code still waits on the Milestone 3 runner; the console says so.
