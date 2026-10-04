# ADR-0008: The React sandbox runs on Sandpack's bundler and saves projects in Postgres

**Status:** accepted · **Date:** 2026-10-04

## Context

ROADMAP Milestone 5 promises a React + TypeScript playground with a live
preview (#79). A signed-in student starts from a ready project, edits
`src/App.tsx`, and sees the result update as they type. They can add files
and npm packages, open the running app in its own tab, and download the
project to keep working on their laptop. Projects belong to the account, so
they follow the student between devices.

Building and running untrusted code in the browser needs a bundler, a
dependency resolver for npm packages and an isolated place to run the
result. None of these exist in the platform today. The graded frontend
challenges planned for Milestone 3 (ADR-0006) have different needs: no
network and a grader that can't be gamed. This sandbox is for practice and
building, not grading.

## Decision

- **Sandpack runs the code.** `@codesandbox/sandpack-react` provides the
  editor (CodeMirror 6, the same family the coding board uses) and the
  file state. `@codesandbox/sandpack-client` drives the preview: CodeSandbox's
  hosted in-browser bundler compiles TypeScript and JSX, installs npm
  packages from `package.json`, and hot-reloads the app on each edit.
- **The preview runs on the bundler's origin**, never squadup.in, so code in
  it can't read the app's session, cookies or storage.
- **We drive the preview client ourselves** (`useBundlerPreview`) rather
  than through `<SandpackPreview>`. That component registers its client from
  an effect without cancelling the first, so React's StrictMode double
  mount in development leaves two clients on one iframe: edits stop
  reaching the preview and its loading overlay never clears. Our hook
  throws away a cancelled client, and draws the loading, timeout and console
  states from the design tokens.
- **Projects use Vite's layout** (`index.html`, `src/main.tsx`,
  `src/App.tsx`, `package.json`, `tsconfig.json`, `vite.config.ts`). The
  preview starts from `src/main.tsx`, the entry `index.html` names, so the
  same files run in the browser and, once downloaded, with
  `npm install && npm run dev`.
- **The API stores the files**: a `sandboxes` table with the project as one
  `jsonb` object of path to source, owned by a user. The editor autosaves
  the whole project about a second after typing stops. A project is capped
  at 100 files and 80 KB of source, which keeps every save under the API's
  100 KB JSON body limit, and a person at 50 sandboxes. Only the owner can
  read or change one; anyone else gets a 404.
- **`package.json` is read-only in the editor.** The bundler re-reads it on
  every change, and half-typed JSON breaks the preview, so packages are
  added and removed from a Packages panel that always writes valid JSON.
- **The new-tab preview follows the editor over a `BroadcastChannel`.** It
  opens on the saved project and then applies each version the editor tab
  posts, with no server round trip.
- **Folders are implied by file paths.** The explorer is a VS Code-style
  tree (folders, a right-click menu, renaming in place), but the project is
  still a flat map of path to source. A folder with nothing in it yet is
  kept by the explorer until a file goes in it, and isn't saved.
- **Downloading is client-side**: the browser zips the files with `fflate`.

## Alternatives rejected

- **Our own bundler (esbuild-wasm in a Web Worker, packages from esm.sh).**
  No third party at run time, but about 10 MB of wasm, and we would own the
  module graph, CSS imports, React refresh and the error overlay. Worth
  revisiting if the hosted bundler becomes a problem; the graded challenges
  in ADR-0006 still plan this route.
- **StackBlitz WebContainers.** A real Node and Vite in the browser, but it
  needs a commercial licence in production and cross-origin isolation
  headers (COOP/COEP) on the whole site.
- **Saving in the browser only (localStorage).** No API or schema change,
  but projects wouldn't follow the student to another device.
- **Turning off `reactStrictMode`** to work around `<SandpackPreview>`. It
  would weaken development checks for the whole app to suit one component.

## Consequences

- The preview depends on CodeSandbox's hosted bundler and npm CDN. If they
  are down or slow, the preview shows a timeout with Try again; editing and
  saving still work.
- Students can run any code and load any npm package in the preview. That
  is fine here because it runs on another origin; it is why this sandbox is
  not used for proctored arenas or graded challenges.
- Projects over 80 KB of source can't be saved. Raising the limit means
  raising the body limit for this route or saving files one at a time.
- Sharing, forking and collaborative editing are not built; a sandbox is
  private to its owner.
