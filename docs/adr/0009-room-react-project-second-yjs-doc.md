# ADR-0009: A board room's React project is a second Yjs document, behind feature flags

**Status:** accepted · **Date:** 2026-10-04

## Context

The coding board (ADR-0007) and the React sandbox (ADR-0008) shipped as
separate things: a room shares code in one language at a time, and a
sandbox belongs to one person. Squads want to build a React app together in
the room they already code in (#81), with the same live cursors, Follow and
presence the code editor has.

Both features are also new and still being tried. They need to open to
chosen people first, then to everyone, and close quickly if something goes
wrong, without a deploy. The API already had feature flags (a kill switch,
per-user grants and denies, roll-out to everyone, and access requests), but
nothing checked one and ops had no screen for them.

## Decision

- **The room's project is a second Yjs document**, not more keys in the
  board's document. It holds `files`, a `Y.Map` of path to `Y.Text`. Which
  file each person has open is presence. It syncs over the same `/boards`
  socket on its own events (`sandbox:open`, `sandbox:update`,
  `sandbox:awareness`, `sandbox:leave`) in its own Socket.IO room, and is
  stored in a new `board_sandbox_documents` table that cascades with the
  board, so it expires with the room.
- `BoardRoomsService` keys live rooms by **document kind and board**, with
  each kind's storage, seed and events described once. The code document
  is seeded on first open, as before. The project is never seeded: it opens
  only after someone **starts it once** with `POST /boards/:code/sandbox`,
  from the template's files or a copy of one of their own sandboxes. The
  insert is `ON CONFLICT DO NOTHING`, so a second start gets 409. The room
  hears `sandbox:ready` and every open tab opens it.
- **The web app shares its panels, not its editor.** The file explorer and
  Packages panel edit a small `ProjectFiles` interface, backed by Sandpack
  in the personal workspace and by the Yjs document in a room. A room
  edits with the board's CodeMirror and `y-codemirror.next`, which now takes
  any `Y.Text`, so carets work the same in both views. Everyone runs their
  own Sandpack preview of the shared files.
- **Two flags gate the features**, declared in code and seeded on but rolled
  out to nobody: `codingBoard` (board routes and opening the code document)
  and `reactSandbox` (sandbox routes, the room's project and its start
  route, which also needs `codingBoard`). A route's flags add to its
  controller's. The socket checks flags when a document is opened.
- **Ops sets each flag's audience** to off for everyone, only selected
  people, or everyone, and grants, denies or removes people and handles
  access requests, at `/feature-flags` in the console. People a flag doesn't
  reach see the feature as early access and can ask for it.

## Alternatives rejected

- **Project files as more keys in the board's document.** One sync path,
  but every room would load the project's bytes and history, the 4 MB cap
  would be shared with the whiteboard, and the server couldn't refuse
  project edits to someone without the flag, because updates to one
  document can't be filtered by key.
- **Sandpack's own editor bound to Yjs.** Its provider owns the file state
  and resets edits when its `files` change, which fights a CRDT. Our editor
  already does collaborative CodeMirror.
- **A share link to a personal sandbox.** Simpler, but it's a second
  membership model next to rooms, and it loses the room's presence, chat
  and Follow.
- **Checking flags on every socket update.** A database read per keystroke.
  Checking on open is enough for a switch whose purpose is rollout.

## Consequences

- Turning a flag off doesn't remove people who already have a room open;
  they're refused when they reconnect or reopen it. A deploy restart
  reconnects everyone, so a deploy enforces it at once.
- The server limits the shared project's total size (the 4 MB document cap)
  but not its file count or the sandbox API's 80 KB of source. Save a copy
  says when a project is too large to keep.
- Each person's preview compiles the shared files on their own machine, so
  console output is per person, and a large package installs once per
  viewer.
- The web app mirrors the socket event names and the `files` layout by
  convention (`board.constant.ts`, `sandbox.constant.ts`), as ADR-0007 does.
- ADR-0008's note that a sandbox can't be edited together is now true only
  of personal sandboxes.
