# @squadup.in/ui

The shared design system. Both `@squadup.in/web` and `@squadup.in/ops` consume it,
so anything that should look the same in both apps belongs here.

## Layout

```
src/
  atoms/        single-purpose primitives (Button, Input, Badge…)
  molecules/    small compositions of atoms (Modal, DataTable…)
  organisms/    page-level compositions
  styles/       index.css — tokens, Tailwind theme, base layer
  utils.ts      cn() and tv()
```

## Consuming it

The library is used straight from TypeScript source — there is no build step in
the dev loop, so edits hot-reload in both apps. Each app imports the stylesheet
once, from its root layout:

```ts
import '@squadup.in/ui/styles.css';
```

and components by name:

```tsx
import { Button, cn } from '@squadup.in/ui';
```

## Rules

- Always import `tv` from `../utils`, never from `tailwind-variants` directly —
  the local one is configured to merge our custom typography utilities.
- Register every new `@utility text-*` in `FONT_SIZE_SUFFIXES` in `src/utils.ts`,
  otherwise `tailwind-merge` mistakes it for a text colour and drops it.
- Interactive components need the `'use client'` directive: both consumers are
  Next.js App Router apps that render server-side by default.

## Checks

```
npx nx build @squadup.in/ui      # tsc --build (declarations only)
npx nx lint @squadup.in/ui
```

`nx build` and `nx dev` on either app build this library first, so you rarely
run it by hand. On a fresh clone though, the apps are TypeScript project
references pointing at `dist/`, and your editor reports `TS6305` until those
declarations exist — run the build above once and it clears.
