# AI_RULES_FE.md

## Frontend implementation rules (Nx monorepo — Next.js platform)

These rules define how agents and contributors build frontend code in this
repository. They are adapted from the shared conventions used across the other
regiment repos, corrected for two differences that matter here: this workspace
runs **Next.js App Router**, not Vite with React Router, and it has a real
`libs/` layer.

---

## 1. Required stack

- React 19
- TypeScript, strict
- **Next.js 16, App Router**
- Tailwind CSS v4 (CSS-first config; no `tailwind.config.js`)
- tailwind-variants + tailwind-merge, always through the local `tv` / `cn`
- `motion/react`
- lucide-react for icons
- Redux Toolkit and RTK Query, once there is API data to fetch
- react-hook-form with zod for forms
- Jest for unit tests

### Prohibited

- `shadcn/ui`
- `radix-ui`
- `framer-motion` (use `motion/react`)
- `react-router` / `react-router-dom` (this app routes through `app/`)
- `tv` imported straight from `tailwind-variants` (see §5.3)
- Hardcoded hex colors, or raw pixel values where a token exists
- Arbitrary folder structures outside the layout in §2 and §3

---

## 2. Workspace layout

```
apps/
  api/        NestJS
  ops/        Next.js — internal operations surface
  web/        Next.js — public product and marketing
libs/
  ui/         @squadup.in/ui — the design system, shared by web and ops
```

Import the design system by package name, never by relative path:

```ts
import { Button, Typography } from '@squadup.in/ui';
```

---

## 3. App structure (`apps/web/src`)

```
app/                    App Router only — routes, layouts, route handlers
  layout.tsx
  page.tsx
  global.css
components/             Reusable UI that is NOT shared with ops
  atoms/
  molecules/
  organisms/
features/               Domain modules
  <feature>/
    api/                RTK Query createApi
    components/         Feature UI
    constants/          Static, typed content
    hooks/
    schemas/            zod
    slice/              RTK slices
    types/
    utils/
    index.ts            Public barrel
hooks/                  Generic shared hooks
lib/utils/              Generic helpers, one per file
providers/              Client context providers
store/                  Redux store composition
types/                  Cross-feature types
```

### Rules

- `app/` holds **routing composition only**. A route file imports feature
  components and arranges them. No business logic, no reusable UI.
- Anything reusable across both apps belongs in `libs/ui`, not in
  `apps/web/src/components`.
- Features may depend on `libs/ui`, shared hooks, utils and types.
- Cross-feature imports should be rare. Prefer lifting the shared piece.
- Every feature exposes its public surface through `index.ts`.

### File naming inside a feature

Follow the convention used across the regiment repos:

```
landing.constant.ts      landing.types.ts      landing.schema.ts
landing.slice.ts         landingApi.ts
```

---

## 4. Design system structure (`libs/ui/src`)

```
atoms/       Pure primitives — no business logic, no data fetching
molecules/   Compose atoms
organisms/   Compose atoms and molecules
styles/      index.css — the single stylesheet for every surface
utils.ts     cn and tv
index.ts     Re-exports all three layers plus cn / tv
```

- One component per file, **default export**, named export for its props type.
- Every component is registered in its layer's `index.ts`.
- Atoms never fetch data and never reach into feature state.

---

## 5. Styling rules

### 5.1 Tokens live in one place

All design tokens are declared in `libs/ui/src/styles/index.css`, which both
apps import and nothing else:

```css
@import '@squadup.in/ui/styles.css';
```

This is deliberate: web and ops share one stylesheet so they cannot drift. Keep
app-specific rules below that import.

### 5.2 Semantic tokens only

Colors are declared once as HSL triplets in `@layer base`, then surfaced to
Tailwind through `@theme` as `--color-*: hsl(var(--*))`.

Use the semantic name, never the raw value:

```
background  foreground  card  popover  primary  secondary
muted       accent      border input   ring     destructive
success     warning     info  danger
arena-frontend  arena-backend  arena-devops  arena-react  arena-ai
```

Each arena accent has a matching `-soft` for the pale tile behind an icon.

Elevation is `shadow-1` through `shadow-5`. Radius is `rounded-sm` through
`rounded-2xl`, all derived from `--radius`.

If a shade is missing, **add a token first**. Do not inline a hex value.

### 5.3 The `tv` / `cn` rule

Import both from the library, never `tv` from `tailwind-variants` directly:

```ts
import { cn, tv } from '../utils'; // inside libs/ui
import { cn } from '@squadup.in/ui'; // everywhere else
```

`tailwind-variants` runs its own internal merge, so configuring `cn` alone is
not enough. The local `tv` is preconfigured with the same merge config.

### 5.4 Custom typography utilities must be registered

Every `@utility text-*` block in `styles/index.css` must also appear in
`FONT_SIZE_SUFFIXES` in `libs/ui/src/utils.ts`. tailwind-merge reads an
unrecognised `text-*` as a text **color**, so an unregistered size is silently
dropped by a following `text-white`. These two lists change together.

---

## 6. Typography rules

All text renders through the `Typography` atom. Two independent scales:

- **Product scale** — `h1`–`h6`, `subtitle`, `subtitle2`, `body`, `bodySmall`,
  `bodyMuted`, `caption`, `micro`, `overline`. Fixed at every breakpoint so app
  chrome stays consistent.
- **Display scale** — `displayXl`, `displayLg`, `displayMd`, `displaySm`.
  Marketing only. Responsive: the variables are redefined at the `sm`
  breakpoint rather than by adding responsive classes at each call site.

### Rules

- `variant` picks the size, `as` picks the tag. They are independent, so a
  section heading can be visually `displayMd` and semantically an `<h2>`.
- One `<h1>` per page.
- Heading levels descend without skipping.

---

## 7. Server and client components

Default to **server components**. Add `'use client'` only when a file needs
state, effects, event handlers, or browser APIs.

Currently client: `Button`, `MotionWrapper`, `Accordion`.

- Never put `'use client'` at the top of a route file to make a child work.
  Push the boundary down to the component that actually needs it.
- RTK Query hooks are client-only. A server component cannot call them.

---

## 8. State and data access

- One `createApi` per feature at `features/<feature>/api/<feature>Api.ts`, each
  with its own `reducerPath`, over a shared base query.
- Slices at `features/<feature>/slice/<feature>.slice.ts`.
- `store/index.ts` composes every reducer and middleware, and exports typed
  `useAppDispatch` / `useAppSelector` via `.withTypes<>()`.
- The store resets on logout so no state leaks to the next user.
- **UI components must not fetch data.** Data enters through a feature
  component or a server component and is passed down as props.

### Static content

Content that has no API behind it yet lives in
`features/<feature>/constants/<feature>.constant.ts` as typed arrays, shaped to
match what the endpoint will eventually return. Swapping in real data should
then be a one-file change.

---

## 9. Assets

- Images go in `apps/web/public/`, referenced by root-relative URL.
- Render through `next/image`, not a bare `<img>`, wherever the optimizer
  earns its keep. The one exception is inside `libs/ui`, which must stay
  framework-agnostic.
- Anything in `public/` is reachable by URL. Nothing private goes there.

---

## 10. Motion

- Scroll reveals use the `MotionWrapper` atom. Stagger siblings with `delay`.
- Ambient, always-running effects are CSS keyframes in `styles/index.css`.
- Every animation must honour `prefers-reduced-motion`. `MotionWrapper` and the
  CSS animations already do.
- Keep motion subtle. The product brief bans flashy animation everywhere.

---

## 11. Accessibility

- Interactive elements are real `<button>` or `<a>`, never a clickable `<div>`.
- Disclosure widgets carry `aria-expanded` and `aria-controls`.
- Decorative icons take `aria-hidden="true"`. Meaningful ones get a label.
- Visible focus everywhere. Do not remove the focus ring without replacing it.

---

## 12. Code quality

- Strict TypeScript. No `any` without a written justification.
- Small, focused components.
- Comments explain **why**, not what. Match the density of the surrounding file.
- Public surface goes through `index.ts`.
